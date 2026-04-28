# Okchu — Proje Durumu

> Bu dosya canlı durumun özetidir. Yeni oturumda referans olarak kullan.
> En son güncelleme: 2026-04-28

---

## 📍 ŞU ANKİ DURUM

| | Detay |
|---|---|
| **App Store** | 1.0.1 yayında (✅ ama bug'lı — aşağıda detay) |
| **TestFlight** | 1.0.2 build 244 — Codemagic'ten upload tamamlandı (`commit 3521f7c`) |
| **Apple Review** | 1.0.2 henüz submit edilmedi — kullanıcı testten sonra submit edecek |
| **AdMob** | Yayıncı hesabı onaylandı, app-ads.txt verified (`okchu-legal` repo) |
| **Apple ID** | `6762461650` |
| **Bundle ID** | `com.arslanaytac.okchu` |
| **Premium IAP** | `com.arslanaytac.okchu.premium` (lifetime, non-consumable) |

---

## ⚠️ 1.0.1'DE OLUP 1.0.2'DE DÜZELTİLEN KRİTİK BUG'LAR

### 🔴 Reklam gelirini sıfıra düşüren bug
**Sorun**: `js/main.js`'de `location.hostname === 'localhost'` Capacitor iOS'ta TRUE
döner (`okchu://localhost/...` scheme), bu yüzden production'da `testMode: true`
olarak çalışıyor → AdMob TEST reklam unitleri yüklenmiş, gerçek gelir = $0.
**Çözüm**: `Capacitor.isNativePlatform()` kontrolü öncelikli, native iOS
**her zaman** prod ad units kullanır.
**Commit**: `4e69309`

### 🔴 iOS Taptic Engine titreşimi hiç çalışmıyordu
**Sorun**: Tüm haptic çağrıları `navigator.vibrate(...)`. Apple iOS Safari +
WKWebView'da bunu **bilinçli olarak no-op** ediyor. `@capacitor/haptics`
paketi yüklüydü ama hiç kullanılmıyordu.
**Çözüm**: Yeni `js/haptics.js` modülü — `@capacitor/haptics` ile native
Taptic Engine'i kullanır, web'de `navigator.vibrate` fallback'i.
**Commit**: `b13a969`

### 🔴 Yanlış oka basma sorunu (kullanıcı şikayeti)
**Sorun**: `Math.floor(fx)` ile hücre indeksini yuvarlama, sınır taplarında
yanlış komşu hücreye atlatıyordu.
**Çözüm**: 
1. Fractional grid coordinates (yuvarlama yok)
2. **Tier-1 EXACT-cell-hit**: tıklanan hücrede ok varsa O ok kazanır, fuzzy
   override edemez
3. **Tier-2 fuzzy fallback**: boş hücrede 3x3 search + Euclidean distance
4. Finger-tip Y bias 3px (Apple klavye tekniği)
5. Tap position averaging (touchstart + touchend / 2)
**Commits**: `c760453`, `3521f7c`

### 🔴 Banner reklam altta tuşları örtüyordu
**Sorun**: Menü "Reklamları Kaldır", seviye listesi son kart, hikâye "Oyna"
butonları banner'ın altında kalıyordu.
**Çözüm**: `.screen:not(#screen-game) { padding-bottom: calc(72px +
env(safe-area-inset-bottom, 0px)); }`
**Commit**: `5f26257`

### 🔴 PWA install banner native iOS app içinde de çıkıyordu
**Sorun**: `pwa-install.js` UA tabanlı kontrol Capacitor WKWebView'da TRUE
dönüyordu → Apple Store'dan indirmiş kullanıcı "Ana Ekrana Ekle" promp'u
görüyordu. Apple reject riski.
**Çözüm**: `Capacitor.isNativePlatform()` early-return guard.
**Commit**: `a6725d4`

### 🔴 Privacy/Terms/App Store linkleri açılmıyordu
**Sorun**: `limitsNavigationsToAppBoundDomains: true` + `target="_blank"`
sessizce başarısız oluyordu.
**Çözüm**: `capacitor.config.json`'da flag `false`'a çevrildi.
**Commit**: `a6725d4`

### 🔴 Rate-us URL'i placeholder'dı
**Sorun**: `js/rate-us.js` `https://apps.apple.com/app/idPLACEHOLDER` →
5 yıldız veren kullanıcı 404'e gidiyordu.
**Çözüm**: Gerçek App Store ID `6762461650` + `?action=write-review`.
**Commit**: `5f26257`

---

## 🎮 EKLENEN YENİ ÖZELLİKLER (1.0.2)

### Predictive touch feedback (Arrows Puzzle seviyesinde)
- `touchstart` → hangi ok seçilecek? **hemen highlight**
- `touchmove` → parmak kayarsa highlight **canlı güncellenir**
- `touchend` → o anki highlighted ok işlenir
- Pan'a geçince highlight temizlenir

### İnteraktif onboarding pointer
- Egypt-1 ilk oyunda pulsing 👆 emoji + sarı halo bir sonraki kaldırılabilir
  ok üzerinde
- 600ms cycle pulse, pinch-zoom + pan ile kilitli kalır
- 3 doğru tap'ten sonra otomatik kaybolur (`localStorage.okchu_onboarding_done`)

### Tap queue (snappy gameplay)
- Animasyon sırasında tıklanan oklar dropped değil, kuyruğa alınır
- Animasyon biter bitmez işlenir (400ms timeout)

### Reklam pacing
- Interstitial: her 4 → her **6 seviye** + 90 sn kilit (localStorage'da kalıcı)
- Banner alt buton örtmeme (CSS padding rule)

### Lokalizasyon (5 dil tam destek)
- TR / EN / ES / FR / JA
- HTML hardcoded TR string'leri → `data-i18n` / `data-i18n-aria` /
  `data-i18n-title` ile çevrildi
- Level-complete overlay, no-lives, settings, achievements, collection,
  leaderboard, premium, time-up, IAP alerts — hepsi
- VoiceOver `aria-label` da çevriliyor
- `Info.plist` `CFBundleLocalizations: [en, tr, es, fr, ja]` → App Store
  sidebar 5 dil gösterir

### Lives resume (background → foreground)
- iOS app background'a alındığında WKWebView setInterval donar
- `visibilitychange` listener: app öne gelince:
  - Kalp ikonlarını storage'tan yeniden çiz
  - No-lives overlay'in countdown'ını refresh et
  - Auto-regenerated life varsa overlay'i kapat

### Production console silence
- Native iOS / https'de `console.log/warn/info/debug` → no-op
- `console.error` korundu (gerçek crash'ler için)

### "Leaderboard" rename → "Haftalık Skorlarım"
- Apple bot'u "Leaderboard" → "hesap gerekiyor" sanmasın diye
- 5 dil + HTML overlay başlığı + menü buton metni

### Diğer küçük düzeltmeler
- `egypt_1` deadlock fix
- Premium fiyat hardcoded ₺49,99 → "—" (locale price IAP'tan gelir)
- `window.__DEBUG__` localhost guard'ı (production'da kapalı)
- Settings reset → tüm flag'leri (onboarding, install banner, rate, ads)
  temizler

---

## 📝 KULLANICININ YAPACAĞI ADIMLAR (sırayla)

### 1. TestFlight build 244'ü test et
- TestFlight uygulamasından "Update"
- Settings → "İlerlemeyi Sıfırla" yap (yeni özellikleri görmek için)
- Egypt-1'e gir, kontrol listesi:
  - [ ] Pulsing 👆 pointer ilk kaldırılabilir okta?
  - [ ] Tıklayınca pointer sonraki oka geçiyor?
  - [ ] 3 tap'ten sonra pointer kayboluyor?
  - [ ] Doğru hamlede iPhone titreşiyor mu?
  - [ ] Yanlış (bloke) oka basınca daha sert titreşim?
  - [ ] Yan yana iki ok varsa, parmak hangisindeyse o seçiliyor mu?
  - [ ] Banner aşağıda var ama menü "Reklamları Kaldır" tuşu tıklanabilir mi?
  - [ ] Settings → Premium → "Kullanım Şartları" Safari'de açılıyor mu?

### 2. App Store Connect'te 1.0.2 hazırla
1. **Distribution → 1.0.2 Prepare for Submission**
2. **Build** alanı → **+** → build 244 seç
3. **What's New in This Version** → 5 dil için (`appstore-listings/` JSON'larında
   yok ama `Promotional Text` içeriklerini kullan + sürüm notu ekle)
4. **App Information → Age Rating → Edit** → **"Advertising": Yes**
5. **App Information → Localizable Information → +** → 4 dil ekle:
   - Turkish (TR) — `appstore-listings/tr.json`
   - Spanish (Mexico) — `appstore-listings/es.json`
   - French — `appstore-listings/fr.json`
   - Japanese — `appstore-listings/ja.json`
   - (English U.S. zaten var)
6. **Submit for Review**

### 3. Apple onayı bekle (24-48 saat)
- Apple onaylayınca **"Release this version"** butonuna bas
- App Store sayfasındaki "Languages" otomatik 5 dil gösterir
- Reklamlar gerçek AdMob unit'lerini yüklemeye başlar (gelir akar)

### 4. 1.0.2 yayında olunca → Apple Search Ads
- **Apple Search Ads Basic** kullan (Advanced değil)
- **Bütçe**: Günlük $10
- **Ülkeler**: 🇮🇪 İrlanda ($3) + 🇬🇧 İngiltere ($7)
- **Match type**: Exact (Broad değil)
- **Customer type**: New users + All users (Returning users KAPALI)
- Suggested keywords:
  ```
  arrow puzzle, brain puzzle, relaxing puzzle, zen puzzle,
  ancient puzzle, casual puzzle, minimalist puzzle, offline puzzle,
  daily puzzle, logic puzzle
  ```

---

## 🚫 SAKINCALAR / DİKKAT

### TEMP test-mode flag'leri
- `js/storage.js` ve `js/main.js`'de UNLOCK_ALL, BYPASS_BOSS, DEV_MODE
  flag'i **YOK** (kontrol edildi). Release güvenli.

### Versiyonlama
- `MARKETING_VERSION` Xcode project'te ayarlanır (`ios/App/App.xcodeproj/project.pbxproj`)
- Şu an: **1.0.2** (Debug + Release)
- Build number Codemagic'te otomatik artar (`agvtool BUILD_NUMBER + 100`)
- Bir sonraki sürüm için **1.0.3'e bump** ETME, gerekiyorsa bunu yap

### Codemagic cert yönetimi
- Apple Developer Program max 2 Distribution cert sınırı
- `codemagic.yaml`'da "Revoke stale Distribution certs" adımı var ama
  bazen Apple silmiyor → 409 hatası
- Hata olursa: https://developer.apple.com/account/resources/certificates/list
  → tüm Distribution cert'leri manuel revoke et → yeniden build başlat

---

## 🗂️ DOSYA REFERANSLARI

### Önemli kod dosyaları
| Dosya | Görev |
|---|---|
| `js/game.js` | Tap detection, render loop, level orchestration |
| `js/renderer.js` | Canvas çizim, getFractionalCellFromPoint, drawOnboardingPointer |
| `js/main.js` | Entry point, applyTranslations, onboarding aktivasyon |
| `js/ads.js` | AdMob, interstitial pacing, persistent gate |
| `js/iap.js` | CdvPurchase, premium ownership |
| `js/haptics.js` | Native Capacitor Haptics wrapper |
| `js/pwa-install.js` | iOS Safari add-to-home-screen banner |
| `js/rate-us.js` | 5★ → App Store, 1-3★ → email |
| `js/lives.js`, `js/storage.js` | Lives + persistence |
| `lang/{tr,en,es,fr,ja}.json` | i18n strings |
| `appstore-listings/*.json` | App Store Connect metadata (kopyala-yapıştır) |
| `capacitor.config.json` | iosScheme, App-Bound Domains |
| `ios/App/App/Info.plist` | CFBundleLocalizations, GADAppId, ATT, SKAdNetwork |
| `codemagic.yaml` | CI pipeline (cert revoke, build, upload) |

### Önemli URL'ler
- App Store sayfası: https://apps.apple.com/app/id6762461650
- Privacy Policy: https://arslanaytac11-alt.github.io/okchu-legal/privacy.html
- Terms: https://arslanaytac11-alt.github.io/okchu-legal/terms.html
- app-ads.txt: https://arslanaytac11-alt.github.io/okchu-legal/app-ads.txt
- GitHub: https://github.com/arslanaytac11-alt/okchu
- AdMob publisher: pub-9257944510825127

---

## 📜 BU OTURUMDA YAPILAN COMMIT'LER (kronolojik)

```
3521f7c  Predictive touch feedback + interactive Egypt-1 onboarding pointer
8c66e5a  Full localization sweep + production console silence + lives resume
b13a969  Native iOS haptics + tap queueing for snappy gameplay
a6725d4  Localize 5 lang + fix native PWA banner + unlock external links
c760453  Tap accuracy: exact-cell-hit priority + tighter Y bias + 1.0.2 bump
3868107  Bump marketing version 1.0 -> 1.0.1
4e69309  Fix: production iOS was serving Google test ads, not real ads
5f26257  Tap accuracy + ad pacing + 5-language store metadata
253f97f  Disable external TestFlight submission — internal upload only
4bf4a24  Auto-trigger Codemagic build on push to main
a306179  Fix unsolvable egypt_1 + improve zoom-out tap + pan threshold
```

---

## 🎯 SONRAKİ ADIM

**Şu an: TestFlight build 244 telefondan test edilecek.**

Test başarılıysa → App Store Connect'te 1.0.2 submit
Apple onaylayınca → Release this version → Reklam vermeye başlayabilirsin

**Vakit kaybetme: 1.0.2 yayına çıkmadan reklam VERME** — çünkü 1.0.1'deki
test ad bug + tıklama bug + lokalizasyon eksiği ile gelen kullanıcı %80
oranında 1. seviyede silip atar. $50 boşa gider.
