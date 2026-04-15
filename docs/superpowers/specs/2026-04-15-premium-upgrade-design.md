# Ok Bulmacasi - Premium Seviye Tasarim Dokumani

**Tarih:** 2026-04-15
**Yaklasim:** Bulmaca Oncelikli (C) — Once bulmaca mekanikleri, sonra motor, sonra gorseller
**Kapsam:** Icerik kalitesi, oyun motoru, kulturel entegrasyon

---

## Genel Bakis

Mevcut oyun %85-90 cilalanmis durumda. Bu tasarim 3 asamada premium seviyeye cikarmayi hedefliyor:

1. **Asama 1: Bulmaca Derinligi** — Zorluk algoritmalari ve kulturel sekil maskeleri
2. **Asama 2: Motor Yenileme** — Animasyonlar, fizik hissi, geri bildirim
3. **Asama 3: Kulturel Polish** — Leonardo gorselleri, menu, ses efektleri

---

## Asama 1: Bulmaca Derinligi

### 1.1 Zorluk Algoritmasi Yenileme

Mevcut `generate-levels.mjs`'deki `pickDirection()` fonksiyonu yenilenecek. Yeni sistem 4 parametre ile kontrol edilecek:

- **`trapRatio`** — Kenar oklarin ice bakma orani
- **`chainDepth`** — Bir oku kaldirmadan once kac baska ok kaldirilmali
- **`density`** — Grid doluluk orani
- **`maxPathLen`** — Maksimum path uzunlugu

#### Zorluk Tablosu

| Cag | Bolum | Zorluk | trapRatio | chainDepth | density | maxPathLen | Grid |
|-----|-------|--------|-----------|------------|---------|------------|------|
| Misir | 1 | Kolay + Ogretici | %10 | 1 | %30 | 6 | 18x14 |
| Yunan | 2 | Orta | %30 | 2 | %40 | 8 | 20x16 |
| Roma | 3 | Zor | %40 | 2 | %45 | 8 | 22x18 |
| Viking | 4 | Zor+ | %50 | 3 | %50 | 10 | 26x20 |
| Osmanli | 5 | Cok Zor | %60 | 3 | %55 | 10 | 26x22 |
| Cin | 6 | Cok Zor+ | %65 | 4 | %60 | 12 | 28x24 |
| Maya | 7 | Efsanevi | %70 | 4 | %65 | 12 | 28x26 |
| Hint | 8 | Efsanevi+ | %75 | 5 | %65 | 12 | 30x28 |
| Ortacag | 9 | Kabus | %80 | 5 | %70 | 14 | 32x30 |
| Final | 10 | Kabus+ | %85 | 6 | %75 | 14 | 32x32 |

#### pickDirection() Yeni Mantik

```
function pickDirection(cell, mask, grid, config) {
  const { trapRatio } = config;
  const isEdge = cellIsOnShapeEdge(cell, mask);

  if (isEdge && Math.random() < trapRatio) {
    // Tuzak: kenardaki ok ice bakar (en cok tikali yone)
    return mostBlockedDirection(cell, mask);
  } else if (isEdge) {
    // Normal: kenardaki ok disa bakar
    return leastBlockedDirection(cell, mask);
  } else {
    // Ic oklar: agirlikli rastgele (zorluga gore)
    return weightedRandomDirection(cell, mask, config);
  }
}
```

#### chainDepth Uygulamasi

Level generator'da `fixSolvability()` fonksiyonu genisletilecek:
- Minimum zincirleme derinlik kontrolu eklenecek
- Bir ok "bedava" (hemen kaldirilabilir) degilse, en az `chainDepth` kadar baska ok once kaldirilmali
- Generator bu derinlige ulasamazsa, oklari yeniden duzenler

### 1.2 Kulturel Sekil Maskeleri

Her cagda en az 2 bolum taninabilir kulturel sekil olusturacak. Mevcut shape generator fonksiyonlari (`makePyramid()`, `makeTemple()` vb.) daha yuksek cozunurluklu ve taninabilir sekilde yeniden yazilacak.

#### Sekil Tablosu

| Cag | Sekil 1 | Sekil 2 |
|-----|---------|---------|
| Misir | Piramit (net ucgen) | Sfenks silueti |
| Yunan | Parthenon sutunlari | Amphora (vazo) |
| Roma | Kolezyum kemeri | Kartal (aquila) |
| Viking | Drakkar gemi | Mjolnir cekic |
| Osmanli | Cami kubbesi + minareler | Lale motifi |
| Cin | Pagoda | Ejderha |
| Maya | Basamak piramidi | Gunes takvimi |
| Hint | Tac Mahal | Lotus cicegi |
| Ortacag | Kale + burclar | Kalkan + kilic |
| Final | Tum medeniyetler karisik | Portal/vorteks |

#### Shape Mask Gereksinimleri

- Her sekil fonksiyonu grid boyutunu parametre olarak alacak
- Sekil icindeki doluluk orani `density` parametresine uyacak
- Sekiller daha yuksek cozunurluk grid'lerde daha detayli olacak (ornegin ejderha 28x24'te net gorunecek)
- Sekil disi hucreler bos kalacak (temiz siluet)

#### Bolum Basina Sekil Dagitimi (Her cagda 5 bolum)

- **Bolum 1-2:** Kulturel sekiller (Sekil 1, Sekil 2) — taninabilir siluet
- **Bolum 3-5:** Serbest geometrik sekiller (daire, kare, yildiz vb.) — zorluk odakli, sekil taninabilirlik onceligi yok

---

## Asama 2: Motor Yenileme

### 2.1 Ok Kaldirma Animasyonu

Mevcut: Basit 400ms kayma.

Yeni: 3 fazli animasyon sistemi:

1. **Anticipation (80ms)** — Ok hafifce ters yone cekilir (yay gibi gerilme hissi)
2. **Launch (200ms)** — Ok hizla yonune dogru firlar, ease-out cubic ile hiz azalarak
3. **Trail + Fade (150ms)** — Arkasinda kisa bir iz (ghost trail) birakarak kaybolur

Toplam: ~430ms. Ease fonksiyonu: cubic-bezier(0.34, 1.56, 0.64, 1) (overshoot ile)

### 2.2 Yanlis Hamle Geri Bildirimi

Mevcut: Kayma + titreme + geri sicrama 500ms.

Yeni:

1. **Ileri hamle (60ms)** — Ok yone dogru kisa hamle
2. **Kirmizi flash (100ms)** — Ok anlik kirmiziya doner
3. **Sarsinti (150ms)** — Ok yerinde 3 kez hizli titrer (sag-sol)
4. **Elastik geri donus (200ms)** — Yumusak bounce ile yerine oturur
5. **Screen shake (100ms)** — Tum grid 2px sarsinti

### 2.3 Dogru Hamle Geri Bildirimi

Yeni eklemeler:

- Ok kaldirildiginda gectigi hucrelerde **parlama dalgasi** (ripple effect, 300ms)
- Son ok kaldirildiginda komsu oklar hafifce **sallanir** (artik serbest olduklarini gosterir)
- Kaldirilabilir oklar subtle bir **nabiz efekti** ile atar (pulse glow, cok hafif)

### 2.4 Seviye Tamamlama

Mevcut: 60 elmas parcacik patlamasi.

Yeni:

1. **Dalga patlamasi (shockwave ring)** — Tum kalan hucrelerden disa dogru halka
2. **Konfeti parcaciklari** — Daire, kare, ucgen, farkli boyutlar, kulturel renk paletinde
3. **Ekran zoom-out** — Hafif zoom-out efekti (bitirdin hissi)

Parcacik renkleri cag bazli:
- Misir: altin, turkuaz
- Yunan: beyaz, mavi
- Roma: kirmizi, altin
- Viking: gumus, buz mavisi
- Osmanli: bordo, altin, turkuaz
- Cin: kirmizi, altin
- Maya: yesil, altin
- Hint: safran, mor, altin
- Ortacag: gumus, turuncu
- Final: tum renkler

### 2.5 Genel Akicilik

- **60fps garanti** — requestAnimationFrame optimize, gereksiz redraw'lar kaldirilir
- **Dokunma tepkisi** — Parmak degdigi anda ok'un hafifce buyumesi (scale 1.05, 50ms)
- **Gecis animasyonlari** — Ekranlar arasi yumusak fade/slide gecisler
- **Zoom/pan** — Daha puruzsuz inertia ile (momentum kaymasi)

---

## Asama 3: Kulturel Polish

### 3.1 Leonardo AI Gorselleri

`assets/leonardo-prompts.md`'deki prompt'lar ile 10 gorsel olusturulacak. Format: PNG, 768x1344 (9:16 dikey mobil).

Kullanim alanlari:

- **Bolum Giris Ekrani (Story Screen):** Tam ekran kulturel gorsel, uzerine hikaye metni overlay, hafif parallax efekti
- **Bolum Secim Kartlari (Chapters Screen):** Kucuk thumbnail, kilitli caglar karartilmis/bulanik

### 3.2 Menu Sistemi Iyilestirme

**Ana Menu:**
- Arka plandaki ok animasyonlari daha akici
- Logo/baslik girisi daha sinematik (scale + fade)
- Buton shimmer efekti daha premium

**Seviye Secim Ekrani:**
- Her bolum kartinda zorluk gostergesi
- Tamamlanmis bolumlerde altin cerceve
- Kulturel mini ikon (piramit, tapinak vb.) her kartta

### 3.3 Ses Efektleri

| Olay | Ses |
|------|-----|
| Ok tiklama | Hafif "tok" sesi |
| Dogru kaldirma | Tatmin edici "whoosh" + "ting" |
| Yanlis hamle | Kisa "buzz" + "thud" |
| Seviye tamamlama | Fanfar + konfeti sesi |
| Menu gecisleri | Yumusak "swoosh" |
| Bolum acilma | Kulturel melodi snippet (3-4 sn) |

Ses dosyalari kucuk mp3/ogg, toplam boyut minimal. Mevcut ses butonu (`btn-sound`) baglanacak.

### 3.4 Kulturel Tema Derinligi

Mevcut CSS tema sistemi korunacak, genisletilecek:

| Cag | Arka Plan | Ok Rengi | Vurgu | Parcacik Renkleri |
|-----|-----------|----------|-------|-------------------|
| Misir | Kum/altin gradient | Koyu kahve | Turkuaz | Altin, turkuaz |
| Yunan | Beyaz/mavi | Lacivert | Zeytin yesili | Beyaz, mavi |
| Roma | Turuncu/tas | Koyu kirmizi | Altin | Kirmizi, altin |
| Viking | Buz mavisi/gri | Koyu gri | Buz mavisi | Gumus, buz mavisi |
| Osmanli | Bordo/turkuaz | Bordo | Altin | Bordo, altin, turkuaz |
| Cin | Kirmizi/altin | Koyu kirmizi | Yesim yesili | Kirmizi, altin |
| Maya | Yesil/tas | Koyu yesil | Zumrut | Yesil, altin |
| Hint | Safran/mor | Koyu mor | Turuncu | Safran, mor, altin |
| Ortacag | Koyu tas/gri | Siyah | Ates turuncusu | Gumus, turuncu |
| Final | Kozmik mor/altin | Derin mor | Gokkusagi | Tum renkler |

---

## Degisecek Dosyalar

### Asama 1 (Bulmaca)
- `generate-levels.mjs` — pickDirection(), fixSolvability(), shape mask fonksiyonlari yeniden yazilacak
- `js/data/levels/*.js` — Tum seviyeler yeniden generate edilecek
- `js/data/chapters.js` — Zorluk etiketleri guncellenecek

### Asama 2 (Motor)
- `js/game.js` — Animasyon sistemi, geri bildirim, screen shake
- `js/renderer.js` — Parcacik efektleri, ripple, pulse glow, trail
- `js/grid.js` — Kaldirilabilir ok tespiti optimizasyonu
- `js/screens.js` — Gecis animasyonlari

### Asama 3 (Polish)
- `css/style.css` — Tema genisletmesi, menu animasyonlari
- `js/screens.js` — Story screen parallax, chapter thumbnails
- `js/main.js` — Ses sistemi baglantisi
- `index.html` — Audio elementleri
- `assets/chapters/` — Leonardo gorselleri (harici olusturulacak)
- `assets/sounds/` — Ses dosyalari (harici olusturulacak)

---

## Kapsam Disi

- Monetizasyon (reklam, uygulama ici satin alma)
- Liderlik tablosu, sosyal ozellikler
- Gunluk meydan okumalar
- PWA / offline mod
- Yeni cag/bolum ekleme (mevcut 10 cag korunacak)
- Backend / bulut kayit
