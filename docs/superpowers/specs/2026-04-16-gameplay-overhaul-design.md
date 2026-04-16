# Ok Bulmacasi - Gameplay Overhaul Design

**Tarih:** 2026-04-16
**Amaç:** Oyunu tatmin edici hale getirmek - zorluk dengesi, zaman baskısı, görsel atmosfer ve geri bildirim sistemlerini kökten revize etmek.

## Sorunlar

1. **Zorluk platosue:** Orta bölümler (3-6) birbirinden ayırt edilemiyor, zorluk artışı hissedilmiyor
2. **Motivasyon eksikliği:** Zamanlayıcı sadece dekoratif, gerçek baskı yaratmıyor
3. **Görsel monotonluk:** Oyun alanı cansız, temalar sadece renk farkı, ok kaldırma anı sönük

---

## 1. Geri Sayım Sistemi

### Süre Limitleri

Her seviye bir geri sayımla başlar. Süre sıfıra ulaşırsa seviye kaybedilir.

Formül: `timeLimit = baseSec + (pathCount * perPathSec)`

| Bölüm | baseSec | perPathSec | Örnek (30 ok) |
|-------|---------|------------|---------------|
| 1-2   | 60      | 3.0        | 150s          |
| 3-4   | 45      | 2.5        | 120s          |
| 5-6   | 35      | 2.0        | 95s           |
| 7-8   | 25      | 1.5        | 70s           |
| 9-10  | 20      | 1.0        | 50s           |

### Dinamik Süre

- **Doğru hamle:** +3s bonus
- **Yanlış hamle:** -5s ceza (mevcut can kaybına ek)
- **Combo x3+:** +1s ekstra bonus per hamle

### Gerilim Katmanları

| Kalan süre | Efekt |
|-----------|-------|
| < %30     | Sayaç kırmızıya döner, nabız gibi atar (scale 1.0→1.1, 500ms cycle) |
| < %15     | Ekran kenarları kırmızı parıldar (vignette efekti, alpha pulse) |
| < %5      | Kalp atışı ses efekti (80Hz bass pulse, 600ms interval) |

### Süre Doldu Ekranı

- Mesaj: "Süre Doldu!"
- 1 can kaybı (mevcut can sistemiyle uyumlu)
- "Tekrar Dene" butonu
- Mevcut `overlay-no-lives` ile aynı yapıda yeni overlay

### Implementasyon Notları

- `game.js`: `startLevel()` içinde `this.timeRemaining` başlatılır
- Mevcut `this.startTime` ve timer display geri sayıma dönüştürülür
- `game-timer` elementi geri sayımı gösterir (MM:SS formatı)
- `handleTap()` içinde doğru/yanlış hamle süre bonusu/cezası uygulanır
- Render loop'ta gerilim efektleri `timeRemaining / timeLimit` oranına göre tetiklenir

---

## 2. Zorluk Eğrisi Revizyonu

### Yeni Mekanikler (Bölüm 3-6)

#### Bölüm 3 - Roma: Zırhlı Oklar
- Bazı oklar zırhlı olarak işaretlenir (`path.armor = 2`)
- İlk tıklama zırhı 1 düşürür (kaldırmaz), ikinci tıklama kaldırır
- Görsel: metalik parlama overlay, zırh kırılma animasyonu (çatlak efekti)
- Zırhlı oklar seviyedeki okların ~%20'si

#### Bölüm 4 - Viking: Buzlu Oklar
- Bazı oklar buzlu işaretli (`path.frozen = false` başlangıçta)
- Bir buzlu ok kaldırıldığında, komşu hücrelerdeki oklar 3s dondurulur (`path.frozenUntil = timestamp`)
- Donmuş oklar tıklanamaz (tıklanırsa yanlış hamle sayılmaz, sadece buz efekti oynar)
- Görsel: buz kristali overlay, donma yayılma animasyonu, çözülme animasyonu
- Buzlu oklar seviyedeki okların ~%25'i

#### Bölüm 5 - Osmanlı: Zincirleme Oklar
- Aynı `colorIndex`'e sahip bitişik oklar zincir oluşturur
- Zincirdeki herhangi bir ok kaldırıldığında, zincirdeki tüm kaldırılabilir oklar otomatik kaldırılır
- Görsel: aynı renkteki bitişik oklar arası ince zincir çizgisi, zincirleme patlama animasyonu
- Zincirleme kaldırma combo'yu hızla artırır (her ok ayrı combo adımı)

#### Bölüm 6 - Çin: Ayna Okları
- Bazı oklar ayna çifti olarak eşleştirilir (`path.mirrorPairId`)
- Bir ayna oku kaldırıldığında, yönü ters olan eşi otomatik kaldırılır (eş de kaldırılabilir durumdaysa)
- Görsel: ayna okları arasında ince parlak çizgi, eşi kaldırılırken ayna parlaması efekti
- Ayna okları seviyedeki okların ~%30'u

#### Bölüm 7-10: Mevcut mekanikler karışık kullanılır
- Bölüm 7: Zırhlı + Buzlu
- Bölüm 8: Zincirleme + Ayna
- Bölüm 9: Tüm mekanikler
- Bölüm 10: Tüm mekanikler + en yüksek yoğunluk

### Yoğunluk (Density) Artışı

| Bölüm | Eski Density | Yeni Density |
|-------|-------------|-------------|
| 1     | 0.30        | 0.38        |
| 2     | 0.35        | 0.42        |
| 3     | 0.40        | 0.50        |
| 4     | 0.42        | 0.54        |
| 5     | 0.45        | 0.58        |
| 6     | 0.48        | 0.62        |
| 7     | 0.50        | 0.65        |
| 8     | 0.52        | 0.68        |
| 9     | 0.54        | 0.70        |
| 10    | 0.56        | 0.72        |

### Grid Boyut Artışı

| Bölüm | Eski max | Yeni max |
|-------|---------|---------|
| 1-3   | 14x18   | 16x20   |
| 4-6   | 16x20   | 18x22   |
| 7-9   | 18x22   | 20x25   |
| 10    | 20x25   | 22x28   |

### Implementasyon Notları

- `ArrowPath` sınıfına yeni alanlar: `armor`, `frozenUntil`, `mirrorPairId`, `chainGroupId`
- `generate-levels.mjs`: density ve grid boyutu parametreleri güncellenir
- `game.js` `handleTap()`: mekanik kontrolü bölüme göre dallanır
- Her mekanik kendi fonksiyonunda izole edilir: `handleArmorHit()`, `handleFreezeSpread()`, `handleChainRemoval()`, `handleMirrorRemoval()`
- Level validator güncellenir: yeni mekaniklerle çözülebilirlik kontrolü

---

## 3. Tema Atmosferi

### Arka Plan Parçacık Sistemleri

Her bölüm canvas'a çizilen ambient parçacıklara sahip olur. Parçacıklar oyun alanının arkasında, düşük opacity ile render edilir.

| Bölüm | Parçacık Tipi | Hareket | Renk |
|-------|--------------|---------|------|
| 1 Mısır | Kum taneleri | Yavaş sağa süzülme + hafif düşüş | Altın/bej |
| 2 Yunan | Zeytin yaprakları | Yavaş düşüş + sallanma | Yeşil/altın |
| 3 Roma | Kıvılcımlar | Yukarı yükselme + sönme | Turuncu/kırmızı |
| 4 Viking | Kar taneleri | Düşüş + rüzgar sallanması | Beyaz/açık mavi |
| 5 Osmanlı | Lale yaprakları | Yavaş düşüş + dönme | Kırmızı/pembe |
| 6 Çin | Kiraz çiçeği | Yavaş düşüş + spiral | Pembe/beyaz |
| 7 Maya | Ateşböcekleri | Rastgele yüzme + yanıp sönme | Sarı/yeşil |
| 8 Hindistan | Altın toz | Yavaş yükselme + parıldama | Altın |
| 9 Ortaçağ | Sis | Yatay kayma + alpha pulse | Gri/beyaz |
| 10 Final | Karışık tümü | Her tip karışık | Çoklu |

Parçacık sayısı: ~15-20 adet, hafif ve performans dostu.

### Arka Plan Silüetleri

Canvas'ın alt ve yan kenarlarında, çok düşük opacity (%5-10) ile tematik silüetler:

- Mısır: Piramit silüetleri (alt kenar)
- Yunan: Sütunlar (yan kenarlar)
- Roma: Kemerler (üst kenar)
- Viking: Gemi pruva (alt kenar)
- Osmanlı: Kubbe + minare (alt kenar)
- Çin: Pagoda (alt kenar)
- Maya: Basamaklı tapınak (alt kenar)
- Hindistan: Saray kubbesi (alt kenar)
- Ortaçağ: Kale surları (alt kenar)
- Final: Tüm silüetler panoramik

Silüetler basit geometrik şekillerle çizilir (canvas path), görüntü dosyası gerektirmez.

### Ok Görünüm Farklılaşması

| Bölüm | Ok Stili |
|-------|---------|
| 1-3   | Düz, temiz, hafif kalınlaştırılmış (0.07 → 0.09 cellSize) |
| 4-6   | Gövdede hafif çizgi deseni (2px interval dash) |
| 7-9   | Ok uçları süslemeli (çatallı uç, çift çizgi kenar) |
| 10    | Altın parıltılı (gradient fill + shimmer animasyonu) |

### Grid Stili

- Mevcut nokta-grid korunur ama noktalar büyütülür (1.5px → 2.5px)
- Her 4 hücrede bir daha büyük nokta (landmark noktalar, 3.5px)
- Grid çizgileri çok hafif görünür (alpha 0.03-0.05 arası ince çizgiler)
- Köşelerde tematik süs: basit geometrik motif (bölüme özel)

### Implementasyon Notları

- Yeni dosya: `js/particles.js` - parçacık sistemi (spawn, update, draw)
- Yeni dosya: `js/themes.js` - tema tanımları (silüet çizim fonksiyonları, parçacık config, ok stilleri)
- `renderer.js`: `drawGrid()` başına parçacık + silüet render eklenir
- `renderer.js`: `drawPath()` bölüme göre ok stili dallanması
- Parçacıklar `requestAnimationFrame` içinde güncellenir, ayrı tick gerektirmez

---

## 4. Tatmin Edici Kaldırma Efektleri

### Combo Bazlı Artan Efektler

| Combo | Parçacık | Sarsıntı | Ses | Ekstra |
|-------|---------|----------|-----|--------|
| x1    | 8 küçük | yok | mevcut remove | - |
| x2-3  | 16 orta | 1px, 80ms | remove + combo chime | - |
| x4-5  | 24 büyük | 2px, 100ms | pitch yükselen chime | Renkli iz efekti (trail) |
| x6-8  | 32 büyük | 3px, 120ms | yüksek pitch chime | Shockwave halka |
| x9-10 | 48 büyük | 4px, 150ms | özel crescendo | Ekran flash (beyaz, 100ms) |
| x10+  | 64 altın | 5px, 200ms | mega crescendo | "MUHTESEM!" floating text |

### Parçacık Patlaması Detayı

Kaldırılan okun her hücresinden parçacık fışkırır:
- Parçacıklar okun yönü doğrultusunda + rastgele açı spread (±45°)
- Boyut: 2-6px arası rastgele
- Ömür: 400-800ms
- Gravity etkisi: hafif düşüş
- Renk: okun renginden başlar, beyaza fade
- Combo yükseldikçe parçacıklar daha parlak ve daha uzun ömürlü

### Floating Skor Yazısı Güncelleme

- Combo x1: beyaz, 14px, -30px yükselme
- Combo x3+: sarı, 18px, -40px yükselme
- Combo x6+: turuncu, 22px, -50px yükselme, hafif scale bounce
- Combo x10+: kırmızı, 28px, -60px yükselme, glow efekti

### Renkli İz Efekti (Trail)

Combo x4+ olduğunda, kaldırılan okun snake animasyonu sırasında arkasında kısa süreli renkli iz kalır:
- İz rengi: okun rengi + parlaklık artışı
- İz genişliği: ok genişliğinin 2x'i
- Fade süresi: 300ms
- Combo arttıkça iz daha parlak

### Yanlış Hamle Efekti Güçlendirme

Mevcut 4-fazlı animasyon korunur, ek olarak:
- Ekrana kısa süreli çatlak deseni (canvas üzerine çizilen radial çatlak çizgileri, 300ms fade)
- Bass ses 120Hz → 80Hz (daha derin, daha hissedilen)
- Geri sayım sayacından -5s düşerken: sayaç 1.5x büyür + kırmızı flash (200ms)

### Implementasyon Notları

- `game.js`: `removePathWithAnimation()` combo seviyesine göre efekt parametreleri
- `renderer.js`: yeni `drawRemovalParticles()`, `drawTrailEffect()`, `drawCrackEffect()` metodları
- `sound.js`: combo seviyesine göre pitch/volume ayarı, yeni `heartbeat` ve `megaCombo` sesleri
- Parçacık havuzu (pool) kullanılır - her frame'de yeni obje yaratılmaz

---

## 5. Yıldız Sistemi Güncelleme

### Yeni Kriterler

| Yıldız | Koşul |
|--------|-------|
| 1      | Seviyeyi tamamla (süre dolmadan) |
| 2      | Sürenin %50'si kalarak tamamla + max 2 yanlış hamle |
| 3      | Sürenin %70'i kalarak tamamla + 0 yanlış + hint kullanmama |

### İlerleme Sistemi

- Bölüm seçim ekranında her bölümün altında `X/15` yıldız gösterimi
- Sonraki bölümü açmak için: önceki bölümden en az 10 yıldız (mevcut: 5 seviye tamamla)
- Ana menüde toplam yıldız sayısı: `X/150` formatında

### Seviye Tamamlama Ekranı Güncelleme

- Yıldızlar tek tek animasyonla gelir (0.5s arayla, scale bounce + parıltı)
- Her yıldızda ayrı ses efekti (artan pitch: C5, E5, G5)
- 3 yıldız alındığında ekstra kutlama: altın parçacık patlaması
- Süre istatistiği eklenir: "Kalan süre: 45s" + ne kadar süre bonusu kazanıldığı

### Implementasyon Notları

- `game.js`: `calculateStars()` yeni formüle güncellenir
- `storage.js`: `totalStars()` helper fonksiyonu
- `screens.js`: bölüm kartlarında yıldız gösterimi, kilit açma yıldız bazlı
- `main.js`: tamamlama overlay'inde animasyonlu yıldız sunumu

---

## 6. Seviye Yeniden Üretimi

Tüm 50 seviye yeni parametrelerle yeniden üretilir:

- `generate-levels.mjs` güncellenir: yeni density, grid boyutları, mekanik atamaları
- Her bölümün level dosyası yeniden oluşturulur
- Yeni mekanik alanları eklenir: `armoredPaths`, `frozenPaths`, `chainGroups`, `mirrorPairs`
- Level validator güncellenir: yeni mekaniklerle çözülebilirlik doğrulaması

---

## Dosya Değişiklik Haritası

| Dosya | Değişiklik |
|-------|-----------|
| `js/game.js` | Geri sayım, mekanikler, combo efektleri, süre bonusu/cezası |
| `js/renderer.js` | Parçacıklar, silüetler, ok stilleri, gerilim efektleri, trail, crack |
| `js/arrow.js` | Yeni alanlar: armor, frozenUntil, mirrorPairId, chainGroupId |
| `js/sound.js` | Heartbeat, mega combo, pitch scaling, derin bass |
| `js/screens.js` | Yıldız gösterimi, yıldız bazlı kilit açma, süre istatistiği |
| `js/main.js` | Süre doldu overlay, animasyonlu yıldız sunumu |
| `js/storage.js` | totalStars helper, yeni level score alanları |
| `js/levels.js` | Yeni mekanik verileri import |
| `js/particles.js` | **YENİ** - Parçacık sistemi (ambient + removal + celebration) |
| `js/themes.js` | **YENİ** - Tema tanımları (silüet, parçacık config, ok stili) |
| `css/style.css` | Geri sayım stili, gerilim efekti, yıldız animasyonu |
| `index.html` | Süre doldu overlay, güncellenmiş stat alanları |
| `generate-levels.mjs` | Yeni density, grid boyutu, mekanik parametreleri |
| `js/data/levels/*.js` | Tüm 50 seviye yeniden üretilir |
