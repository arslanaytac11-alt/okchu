# Draft App Review notes — Okchu 1.1.0

Confirm these notes against the final uploaded build before pasting into App Store Connect. No screen recording or attachment is claimed here.

Okchu is a single-player arrow-removal puzzle game across ten historical civilizations. This update refreshes the interface, touch feedback, puzzle presentation, and difficulty progression.

No account or login is required. Open Play, select the first chapter, and start its first level. The first two puzzles teach removing arrows with a clear exit. From the third puzzle, arrows also carry a shape symbol: match the current symbol in the visible repeating sequence above the board. Each completed removal advances that sequence. An eligible choice can prevent completing the remaining sequence; free unlimited Undo lets players reconsider choices in these coded puzzles. The question-mark button explains this rule and pauses the timer while open. Clear every arrow to complete a puzzle. Gameplay progress is stored locally and the campaign is available offline. Advertising and purchases require network access.

For precision selection, briefly hold an arrow to magnify the touch area and preview it, then lift the same finger to move it. Pinching or panning cancels a pending selection; zoomed board edges remain reachable.

The local browser inspection flag opens all levels solely on an explicitly requested loopback preview. It cannot activate in the native application or on a remote host, and it does not alter real saved progress or Premium ownership.

The existing non-consumable StoreKit product is `com.arslanaytac.okchu.premium` (Remove Ads). Purchase restoration is available from the premium screen. The app uses Google AdMob with ATT and UMP consent handling. There is no third-party payment processor or required external account.

The interface includes Turkish, English, Spanish, French, and Japanese. Gameplay is the same across regions. The product is a casual puzzle game without regulated services.

Contact: arslan.aytac11@gmail.com
