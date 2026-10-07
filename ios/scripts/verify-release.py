#!/usr/bin/env python3
"""Fail release builds on identity drift, missing assets, or wrong export metadata."""

import argparse
import json
from pathlib import Path
import plistlib
import re
import zipfile

ROOT = Path(__file__).resolve().parents[2]
BUNDLE = "com.arslanaytac.okchu"
VERSION = "1.1.0"
ORIENTATIONS = {
    "UIInterfaceOrientationPortrait",
    "UIInterfaceOrientationLandscapeLeft",
    "UIInterfaceOrientationLandscapeRight",
}


def require(condition, message):
    if not condition:
        raise SystemExit(f"Release check failed: {message}")


def check_plist(info, built=False, build_number=None):
    require(ORIENTATIONS <= set(info.get("UISupportedInterfaceOrientations", [])),
            "portrait and both landscape orientations are required")
    require(not info.get("UIRequiresFullScreen", False),
            "full-screen compatibility mode must not disable dynamic resizing")
    require(info.get("CFBundleIconName") == "AppIcon", "AppIcon name is missing")
    require(info.get("UILaunchStoryboardName") == "LaunchScreen", "launch screen is missing")
    scenes = info.get("UIApplicationSceneManifest", {}).get("UISceneConfigurations", {})
    application_scenes = scenes.get("UIWindowSceneSessionRoleApplication", [])
    require(any(scene.get("UISceneClassName") == "UIWindowScene"
                and scene.get("UISceneStoryboardFile") == "Main"
                and scene.get("UISceneDelegateClassName", "").endswith(".SceneDelegate")
                for scene in application_scenes),
            "a storyboard-backed window scene is required by the iOS 27 SDK")
    if built:
        require(info.get("CFBundleIdentifier") == BUNDLE, "export bundle ID changed")
        require(info.get("CFBundleShortVersionString") == VERSION, "export version is not 1.1.0")
        require(info.get("CFBundleVersion") == build_number, "export build number differs from selected number")
        require(info.get("MinimumOSVersion") == "15.0", "export minimum system version must be iOS 15.0")


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--ipa-dir", type=Path)
parser.add_argument("--build-number")
args = parser.parse_args()

if args.ipa_dir:
    require(args.build_number and args.build_number.isdigit() and int(args.build_number) > 0,
            "provide a positive --build-number")
    ipas = list(args.ipa_dir.glob("*.ipa"))
    require(len(ipas) == 1, "expected exactly one IPA artifact")
    with zipfile.ZipFile(ipas[0]) as archive:
        names = archive.namelist()
        plists = [name for name in names if re.fullmatch(r"Payload/[^/]+\.app/Info\.plist", name)]
        require(len(plists) == 1, "IPA must contain exactly one application")
        app = plists[0].removesuffix("Info.plist")
        check_plist(plistlib.loads(archive.read(plists[0])), built=True, build_number=args.build_number)
        require(app + "Assets.car" in names, "compiled icon asset catalog is missing")
        require(app + "public/index.html" in names, "bundled web entry point is missing")
        require(app + "embedded.mobileprovision" in names, "distribution provisioning profile is missing")
    print(f"Verified {ipas[0].name}: {BUNDLE}, {VERSION} ({args.build_number}).")
else:
    configuration = json.loads((ROOT / "capacitor.config.json").read_text())
    require(configuration.get("appId") == BUNDLE, "Capacitor app ID changed")
    require(configuration.get("ios", {}).get("contentInset") == "never",
            "CSS owns safe-area insets; native automatic insets would apply twice")
    require(not configuration.get("server", {}).get("url"), "a release must load bundled offline assets")
    project = (ROOT / "ios/App/App.xcodeproj/project.pbxproj").read_text()
    versions = re.findall(r"MARKETING_VERSION = ([^;]+);", project)
    require(len(versions) == 2 and set(versions) == {VERSION}, "Debug and Release marketing versions must be 1.1.0")
    targets = re.findall(r"IPHONEOS_DEPLOYMENT_TARGET = ([^;]+);", project)
    require(len(targets) == 4 and set(targets) == {"15.0"}, "project and application deployment targets must be iOS 15.0")
    check_plist(plistlib.loads((ROOT / "ios/App/App/Info.plist").read_bytes()))
    require(BUNDLE + ".premium" in (ROOT / "js/iap.js").read_text(), "existing premium product ID changed")
    require((ROOT / "ios/App/App/public/index.html").is_file(), "run npm run cap:sync before release verification")
    synced = json.loads((ROOT / "ios/App/App/capacitor.config.json").read_text())
    require(synced.get("appId") == BUNDLE and synced.get("ios", {}).get("contentInset") == "never",
            "synced Capacitor configuration is stale")
    print(f"Verified release source and synced native assets for {BUNDLE} {VERSION}.")
