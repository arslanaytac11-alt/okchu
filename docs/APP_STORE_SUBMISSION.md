# App Store Submission — Okchu: Arrow Puzzle

Hazır-kopyala metinler. App Store Connect'te ilgili alanlara yapıştır.

---

## 1. App Information

| Field | Value |
|---|---|
| **App Name** | Okchu: Arrow Puzzle |
| **Subtitle (TR, 30 char max)** | Antik Medeniyet Ok Bulmacası |
| **Subtitle (EN, 30 char max)** | Ancient Arrow Puzzle Journey |
| **Bundle ID** | com.arslanaytac.okchu |
| **SKU** | okchu-ios-001 |
| **Primary Category** | Games |
| **Secondary Category** | Puzzle |
| **Age Rating** | 4+ |
| **Price** | Free (with In-App Purchase) |

---

## 2. Promotional Text (170 char max, güncellenebilir)

**Türkçe:**
> Mısır'dan Roma'ya, Osmanlı'dan Maya'ya — 10 antik medeniyet, 50 seviye, sonsuz bulmaca zekası. Günlük meydan okumada skorunu zirveye taşı!

**English:**
> From Egypt to Rome, Ottoman to Maya — 10 ancient civilizations, 50 levels, endless puzzle intrigue. Climb the leaderboard in daily challenges!

---

## 3. Description

### Türkçe (4000 char max)

```
Okchu, seni 10 antik medeniyetin gizemlerine götüren minimalist bir ok bulmacasıdır. Her bölümde farklı bir dönem, farklı bir atmosfer — Mısır piramitlerinden Viking diyarlarına, Osmanlı saraylarından Maya tapınaklarına.

OYNANIŞ
Izgara üzerindeki okları doğru sırada kaldır. Her ok, yönü boyunca sıradaki oku işaretler. Stratejini planla, kombo yap, yıldızları topla.

ÖZELLİKLER
• 10 Bölüm, 50 Seviye — her bölüm kendi temasıyla
• Günlük Meydan Okuma — her gün yeni bir seviye, haftalık lider tablosu
• 4 Oyun Modu — Klasik, Süreli, Hamle Sınırlı, Zen
• Boss Seviyeleri — her bölümün sonunda özel mücadele
• Güç-Up'lar — İpucu, Zaman Dondurma, Geri Al
• Koleksiyon Sistemi — her bölümün eserini topla
• Offline Oynanır — internete gerek yok
• 5 Dil — Türkçe, İngilizce, İspanyolca, Fransızca, Japonca
• iPhone ve iPad desteği, karanlık mod

PREMIUM
Reklamsız Premium ile kesintisiz oyna. Tek seferlik ödeme.

Geri bildirim ve önerilerin için: arslan.aytac11@gmail.com
```

### English

```
Okchu is a minimalist arrow puzzle that takes you on a journey through 10 ancient civilizations. Each chapter brings a new era, a new atmosphere — from the Egyptian pyramids to Viking fjords, Ottoman palaces to Maya temples.

HOW TO PLAY
Remove arrows from the grid in the correct order. Each arrow points to the next in its direction. Plan your strategy, build combos, collect stars.

FEATURES
• 10 Chapters, 50 Levels — each with its own theme
• Daily Challenge — new level every day, weekly leaderboard
• 4 Game Modes — Classic, Timed, Move-Limited, Zen
• Boss Levels — a special challenge ends each chapter
• Power-Ups — Hint, Freeze Time, Undo
• Collection System — unlock an artifact per chapter
• Play Offline — no internet required
• 5 Languages — Turkish, English, Spanish, French, Japanese
• iPhone & iPad support, dark mode

PREMIUM
Go ad-free with a one-time purchase.

Feedback & suggestions: arslan.aytac11@gmail.com
```

---

## 4. Keywords (100 char max, virgülle)

**Türkçe:** `ok,bulmaca,puzzle,antik,mısır,roma,osmanlı,maya,beyin,zeka,mantık,offline,günlük`

**English:** `arrow,puzzle,ancient,egypt,rome,ottoman,maya,brain,logic,offline,daily,minimalist,game`

---

## 5. Support URLs (gerekli)

| Field | URL (hosting sonrası doldur) |
|---|---|
| **Privacy Policy URL** | `https://<DOMAIN>/privacy.html` |
| **Support URL** | `https://<DOMAIN>/` (veya GitHub issues sayfası) |
| **Marketing URL (opsiyonel)** | `https://<DOMAIN>/` |

> Not: `privacy.html` ve `terms.html` proje kök dizininde hazır. Deploy ettiğin domainle bu URL'leri tamamla.

---

## 6. Screenshots

App Store 6.7" iPhone (1290×2796) gerekli — minimum 3, maksimum 10 ekran.

Projedeki `appstore-screenshots-1290x2796/` klasöründeki dosyaları kullan:
- Menü
- Bölüm seçimi
- Oyun ekranı
- Günlük meydan okuma
- Başarımlar / Koleksiyon

iPad 13" (2048×2732) opsiyonel ama önerilir.

---

## 7. App Privacy Questionnaire (App Store Connect)

App Store Connect sana soracak. Cevaplar:

| Soru | Cevap |
|---|---|
| Do you collect data? | **No** (uygulama lokal çalışır; ileride AdMob eklenirse cevap değişecek — aşağı bak) |
| Third-party analytics? | **No** |
| Tracking (ATT)? | **No** şimdilik |

**AdMob eklendiğinde** (ileride):
- Data types: **Device ID** (IDFA), **Advertising Data**
- Linked to user: **No**
- Used for tracking: **Yes** (eğer personalized ads aktifse)
- Purpose: **Third-Party Advertising**

---

## 8. Age Rating Questionnaire

Tüm sorulara **"None"** — şiddet yok, dil yok, korku yok, kumar yok, kullanıcı ürünü içerik yok. → Sonuç: **4+**

---

## 9. In-App Purchase Setup

App Store Connect → Monetization → In-App Purchases → New

| Field | Value |
|---|---|
| Type | Non-Consumable |
| Reference Name | Premium Ad-Free |
| Product ID | `com.arslanaytac.okchu.premium` |
| Price Tier | Tier 3 (~2.99 USD) — tercihine göre |
| Display Name (TR) | Reklamsız Premium |
| Display Name (EN) | Premium (Ad-Free) |
| Description (TR) | Tüm reklamları kaldır. Tek seferlik ödeme. |
| Description (EN) | Remove all ads. One-time purchase. |

> Review için IAP'ı test ederken screenshot da yüklemen gerekir.

---

## 10. App Review Information

| Field | Value |
|---|---|
| Contact First Name | Arslan |
| Contact Last Name | Aytaç |
| Contact Phone | (senin numaran) |
| Contact Email | arslan.aytac11@gmail.com |
| Demo Account | Gerekmez (login yok) |
| Notes to Reviewer | "No login required. All features accessible offline. Premium IAP removes banner ad. Privacy policy: <URL>" |

---

## 11. Eksik Kalanlar (hesap/lisans düzeyi — sen yapmalısın)

Bunları uygulama içinden değil **dışarıdan** halletmen gerekir — ben yapamam:

1. **Apple Developer Program üyeliği** ($99/yıl) — [developer.apple.com](https://developer.apple.com/programs/enroll/)
2. **Domain + hosting** (privacy.html ve terms.html için halka açık URL). Ücretsiz seçenekler:
   - **GitHub Pages** (repo → Settings → Pages)
   - **Netlify Drop** ([netlify.com/drop](https://app.netlify.com/drop) — zip sürükle bırak)
   - **Vercel** (aynı)
3. **Xcode** (Mac gerekli) veya **PWABuilder.com** (web'den iOS paketi üretir)
4. App icon 1024×1024 PNG (App Store listing icon — şeffaflık yok)

---

## 12. Önerilen Sıralama

```
1. privacy.html + terms.html → Netlify'a yükle, URL al
2. Apple Developer hesabı aç
3. PWABuilder.com → PWA URL'ni ver → iOS paketi indir
4. App Store Connect → yeni uygulama oluştur (yukarıdaki bilgilerle)
5. IAP ekle (premium)
6. Build yükle, screenshots yükle
7. Review'a gönder → 24-48 saat bekle
```
