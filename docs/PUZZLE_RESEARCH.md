# Okchu: bulmaca derinliği ve rakip araştırması

Araştırma tarihi: **7 Ekim 2026**. Bölüm 1–9, önceki kaynak/imzalı adayın araştırmasını ve değerlendirilen tasarım önerisini kaydeder. **Bölüm 10, bunun ardından kaynakta uygulanan görünür rune döngüsünü anlatır.** Rakip uygulamalar kurulup oynanmadı. Yayıncıların App Store açıklamaları, resmi kural belgeleri, Apple'ın halka açık uygulama metaverisi ve seçili App Store yorumları incelendi. Pazarlama iddiaları, kullanıcı anlatımları ve kendi matematiksel çıkarımlarımız aşağıda ayrıdır. Yeni kuralın kaynakta bulunması, eski imzalı IPA'nın güncellendiği veya mağazaya gönderildiği anlamına gelmez.

**Ana bulgu:** Okchu'nun incelenen önceki sabit yönlü, yalnızca ok silen sisteminde her geçerli silme güvenliydi. Daha uzun bağımlılık zincirleri, daha kalabalık tahtalar veya daha kısa süreler gerçek sıralama kararları oluşturmaz. Kullanıcının istediği “şifreyi çözme” duygusu için görünür ve deterministik bir durum kuralı gerekir; kaynakta seçilen karşılık, bölüm 10'daki rune döngüsüdür.

## 1. Doğru rakip kimlikleri

“Arrow Out” adıyla farklı yayıncılara ait çok sayıda uygulama vardır. Ana karşılaştırmada aşağıdaki açık kimlikler kullanıldı; birbirlerinin yorumları veya kuralları birleştirilmedi. Sürümler Apple Lookup API'nin araştırma anındaki yanıtıdır; kalıcı ürün özellikleri değildir.

| Oyun | Yayıncı / App Store ID | İncelenen sürüm | Birincil kayıt |
|---|---|---|---|
| Arrows – Puzzle Escape | Lessmore GmbH / `6748397500` | `0.23.0` | [App Store](https://apps.apple.com/us/app/arrows-puzzle-escape/id6748397500), [yayıncı](https://lessmore.games/) |
| Arrow Out Puzzle | PIXEL KING PTE. LTD. / `6753965803` | `1.7.1` | [App Store](https://apps.apple.com/us/app/arrow-out-puzzle/id6753965803) |
| Tap Away 3D | Popcore GmbH / `1568058543` | `169.5.3` | [App Store](https://apps.apple.com/us/app/tap-away-3d/id1568058543), [yayıncı](https://popcore.com/) |
| Arrow Out: Puzzle Game — ek karşılaştırma | One Date Private Limited / `6756787515` | `1.0.15` | [App Store](https://apps.apple.com/us/app/arrow-out-puzzle-game/id6756787515) |

## 2. Kurallar ile pazarlama arasındaki fark

**Arrows – Puzzle Escape:** Yayıncı, okların çarpışmadan çıkarılmasını, ipuçlarını ve zamansız oynanışı anlatıyor. Çok sayıda elle tasarlanmış bölüm ve yükselen karmaşıklık ilan edilen özelliklerdir; üretim yöntemi, bağımsız bölüm sayısı ve iç zorluk ölçüsü doğrulanmadı. Okchu için faydalı yön, sakin ve doğrudan okunabilen bir çıkış problemi sunmasıdır. [App Store](https://apps.apple.com/us/app/arrows-puzzle-escape/id6748397500), [Lessmore](https://lessmore.games/)

**Arrow Out Puzzle:** Açıklama yönlü ok parçalarını çıkarma ve tahtayı boşaltma üzerine kuruludur. Zamansız deneyim iddiasına karşı bazı yorumlar zaman sınırından söz eder. Sürüm veya mod farkını uygulamayı oynamadan çözmek mümkün olmadığından, “kesinlikle süre yok” sonucuna varılmadı. “Tek doğru sıra” gibi ifadeler de bir solver sertifikası değildir. [App Store](https://apps.apple.com/us/app/arrow-out-puzzle/id6753965803)

**Tap Away 3D:** Belgelenen temel etkileşim, yönlü blokları çıkarmak ve yapıyı parmakla döndürmektir. Artan boyutlar ve değişen blok şekilleri açıklamada özellikle belirtilir. Döndürme, görünmeyen yüzleri incelemeyi ekler; tek başına sıra seçimlerinin geri dönüşsüz sonuçları olduğunu kanıtlamaz. Özel bloklar ve yan modların tam kuralları incelenmedi. [App Store](https://apps.apple.com/us/app/tap-away-3d/id1568058543)

**Sekiz yönlü Arrow Out:** One Date sürümü dört çapraz yönü de ilan ediyor. Bu, izlenecek ışınları ve görsel aramayı artırabilir. Ancak sabit doğrultuda yalnızca parça silme devam ediyorsa, çapraz yön eklemek monotonluğu ortadan kaldırmaz. Milyarlarca bölüm iddiası kalite veya muhakeme derinliği ölçüsü değildir. Bu son cümleler kural modelinden çıkarımdır; rakibin iç kodu incelenmedi. [App Store](https://apps.apple.com/us/app/arrow-out-puzzle-game/id6756787515)

## 3. Yorumlarda görülen sorunlar — anekdot, telemetri değil

Seçili yorumlar kendiliğinden oluşmuş ve mağaza tarafından seçilmiş örneklerdir. Bunlardan sıklık, bütün oyuncuların görüşü veya güncel uygulamada kesin hata oranı çıkarılamaz. Gösterilen ay/günleri, sayfada yıl yazmıyorsa bir yıla atamadık.

| Kaynak / yorum | Kullanıcının anlattığı sorun | Okchu için çıkarım |
|---|---|---|
| Arrows, RalphTomaccio, “A good game for a short period of time!”, 10 Şubat | Tekrarlayan düzenler; zor denilen bölümlerin çoğunlukla daha fazla okla kalabalıklaşması | Geç bölüm sertifikasında ok sayısını zorluk yerine kullanma |
| Arrows, NT3595, “Could use some custom feature options”, 14 Mayıs | Tam tahtayı görememe; küçültülmüş görünümde yanlış oka dokunma; düzensiz zorluk | Bütün düzeni görünür tut; ince çizgi ile dokunma alanını ayrı tasarla |
| Arrow Out, Today's Player, 17 Haziran; “review nickname in mn okay?”, 29 Haziran | Görünümü sığdıramama; tekrarlayan seviyeler ve zor etiketlerinin gerçek yenilik yaratmaması | Etiket ve çerçeve değişimini yeni mantık diye sunma |
| Tap Away, GzDeluxe, 7 Kasım 2023; Larrygizzle, 29 Ekim 2022 | Renk/arayüz karmaşası ve kesintilerin planı hatırlamayı zorlaştırması | Düşünme sırasında reklam veya kutlama ile oyunu bölme |

Yorum bağlantıları: [Arrows açıklama/yorumları](https://apps.apple.com/us/app/arrows-puzzle-escape/id6748397500), [Arrow Out yorumları](https://apps.apple.com/us/app/arrow-out-puzzle/id6753965803?platform=iphone&see-all=reviews), [Tap Away yorumları](https://apps.apple.com/us/app/tap-away-3d/id1568058543).

## 4. Görsel kaynaklar ve Okchu'daki kalınlık sorununun hesabı

Apple Lookup API, resmi mağaza ekran görüntülerinin aşağıdaki Apple CDN adreslerini verdi. Bunlar yayıncı tarafından hazırlanmış mağaza görselleridir; cihaz üstünde gerçek dokunma veya okunabilirlik testi yerine geçmez. Bu araştırmada rakiplerin çizgi kalınlıklarına ilişkin piksel ölçümü yapılmadı. Sayısal hedefler aşağıda **Okchu kaynak kodunun hesabına ve tasarım önerisine** aittir.

| Oyun | Resmi metaveri | Yayıncı ekran görüntüsü |
|---|---|---|
| Arrows | [Apple Lookup](https://itunes.apple.com/lookup?id=6748397500&country=us) | [Gameplay görüntüsü](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/ad/d0/43/add043a3-b812-a31c-a6d2-59651185320d/1290x2796_Gameplay_Arrows_updated_5.png/320x480bb.jpg) |
| Arrow Out | [Apple Lookup](https://itunes.apple.com/lookup?id=6753965803&country=us) | [Mağaza görüntüsü](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/a5/d2/37/a5d237e1-2e0f-dd57-6b67-f74938742435/6.7_-_1.png/320x480bb.jpg) |
| Tap Away | [Apple Lookup](https://itunes.apple.com/lookup?id=1568058543&country=us) | [Mağaza görüntüsü](https://is1-ssl.mzstatic.com/image/thumb/Purple126/v4/11/f4/20/11f420ea-72d0-f6c3-a42f-7dd8a6222a72/46a4ee5c-c2c0-43cc-8255-24faa5e87573_GK-iPhone-1.jpg/392x696bb.jpg) |

Önceki imzalı adayın (main49/Game6/SW35; kaynak `363903d`) `balance.js` ideal gövde oranını `.11` olarak verse de `Renderer._getArrowMetrics()` en az `3.5 / scale` uygular. Normal çizimin dış gölgesi buna `1.4 / scale` daha ekler. Ölçek 1 ve hücre aralığı 18 CSS piksel olduğunda görünen gövde/gölge yaklaşık **4.9 piksel**, yani hücre aralığının **%27.2**'sidir. İdeal oranı azaltmak, minimum kalınlık baskın kaldığında yeterince inceltmez.

Ok başının toplam çapraz genişliği `2 × headRatio × headSpread` ile hesaplanır: önceki adayın `.32 × .62 × 2 = .3968`, yaklaşık **hücrenin %40'ı**. Önceki seçim gövdesi de %40'a kadar genişler. Bunlar kullanıcıdaki dolgun görünümün somut nedenleridir; rakip ölçümü değildir. Kod konumları: `js/balance.js`, `js/renderer.js::_getArrowMetrics`, `drawPath`, `_drawArrowHead`, `drawPreviewHalo`.

Önerilen deneme hedefleri:

- Normal gövde, hücre aralığının yaklaşık **%8–10'u**; ekran üzerindeki taban yaklaşık **1.6–2 CSS piksel**. Sınır ve minimum değerler birlikte değerlendirilmeli.
- Ok başının **toplam** çapraz genişliği yaklaşık **%28–32**; bu, `headRatio` ile aynı sayı değildir.
- Sığdırılmış yoğun görünümde dış gölgeyi, kabartma şeritlerini ve parlak yüzey katmanlarını azalt. Karakter ve medeniyet resmi tahta dışındaki hikâye alanında kalsın.
- Okları inceltirken mevcut hücre/yol tabanlı dokunma geometrisini koru. Dokunma doğruluğunu çizgiyi kalınlaştırarak sağlama.
- 320/390 piksel portre, yatay ekran ve Duo'nun güvenli bölmesinde ilk görünümde bütün şekli gör. Çok küçük hücreler yerine daha kompakt fakat mantıksal olarak daha güçlü düzenler üret.

Bu aralıklar araştırmadaki deneme hedefleridir. Sonraki kaynak uygulaması, gövdeyi **en fazla 2.35 CSS piksel ve hücre aralığının %16'sı**, açık chevron başını en fazla **8 CSS piksel ve hücrenin %34'ü** ile sınırlar; ölçek arttığında yerel çizim genişliği bu ekran ölçüsünü korumak için ölçeğe bölünür. Normal gölgelendirme ve kalın dolgu baş kaldırıldı. Bunlar kaynakta uygulanmış ölçülerdir; yeni bütün veri setinin gerçek cihaz üzerindeki okunabilirlik/dokunma sonucu henüz bu belgede sertifikalandırılmaz.

## 5. Önceki çekirdeğin neden gerçek sıra planlaması yaratmadığı

Bu bölüm rakiplerin kapalı kodu hakkında bir iddia değil, **Okchu'nun önceki main49/Game6/SW35 kaynak adayının** analizidir. O sürümde `Grid.getFirstBlocker()` sabit çıkış ışınındaki engelleri tarar, `isPathClear()` yalnızca bunu kontrol ederdi. `removePath/finalizeRemoval()` yalnızca bir oku kaldırırdı; kalan okların konumunu, yönünü veya bir kapı durumunu değiştirmezdi. Yeni rune koşulu bu geometrik modeli genişletir; aşağıdaki monotonluk sonucu yeni birleşik kural için geçerli değildir.

Kalan ok kümesine `R` diyelim. Bir `a` oku açıkken başka bir oku kaldırmak, `a`'nın önüne yeni engel koyamaz. Açık bir yol açık kalır. Bağımlılık çizgesinde `a → b`, `b`'nin `a` çıkışını engellediği anlamına gelsin. Çözülebilir ve sabit duvar tarafından kalıcı biçimde engellenmeyen bir düzen, döngüsüz bağımlılıklar içerir. Geçerli silme, çıkış bağımlılığı kalmamış bir düğümü kaldırır. Kalan alt çizge yine döngüsüzdür; her boş olmayan döngüsüz çizgede bir sonraki silinebilecek düğüm vardır.

Sonuç: **Her geçerli ilk hamlenin kazanan devamı vardır.** Daha derin zincir, daha fazla kıvrım veya çapraz ışın, arama ve iz sürme yükünü büyütür; güvenli seçenek ile stratejik yanlış seçenek ayrımı yaratmaz. Yalnızca geçerli hamlelerden oluşan çözümde her ok bir kez silindiğinden hamle sayısı da daima ok sayısına eşittir. Bu modelde “en kısa çözüm uzunluğu” aynı biçimde anlamlı bir planlama ölçüsü değildir.

## 6. İki güçlü mantık referansı

Simon Tatham, Solo'nun zorluğunu gerekli **çıkarım teknikleri** üzerinden sınıflandırır; sadece tahta boyutu üzerinden değil. Basit seviyelerde doğrudan doldurulabilir bir yer bulunurken sonraki seviyelerde aday kümeleri üzerinden akıl yürütme gerekir. Map de normal/zor seviyelerde daha karmaşık çıkarımlarla tahminsiz çözümü ayırır. [Solo kuralları](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/solo.html), [Map kuralları](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/map.html)

Tatham'ın tasarım rehberindeki adalet ilkesi, doğru kararı şu anda görünen bilgiden çıkarabilmeyi gerektirir. Solvable üretim ile gerçekten istenen zorlukta üretim farklı problemlerdir: üst sınır solver'ını geçmek, bulmacanın fazla kolay olmadığını kanıtlamaz. Generatör yanlış “çözülebilir” sonucu vermemelidir. [Birincil tasarım rehberi](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/devel/writing.html)

Rush Hour'un resmi kurallarında engelleyen araçlar tahtadan kaldırılmaz; kendi şeritlerinde ileri/geri kayar. Yer değişimi başka bir geçişi kapatabilir. Bunun Okchu açısından tasarım çıkarımı, gerçek planlama için durum değişiminin gerekli olduğudur; bütün oyunu araba kaydırmaya dönüştürmek önerilmiyor. [ThinkFun resmi Rush Hour Deluxe kuralları](https://legacy.thinkfun.com/wp-content/uploads/2017/02/RushHDeluxe-5050-IN.pdf)

## 7. Değerlendirilen ilk öneri: görünür mühür ve tek kullanımlık anahtar

Bu ilk öneri seçilmedi; kaynakta bölüm 10'daki döngü uygulanmıştır. Öneri, önceki ok çıkışını korur. Başlangıçta **tek bir açık/kapalı mühür** vardır. Az sayıda özel okun üzerinde aynı mühür simgesi görünür. Anahtar işaretli ok çıkarılınca o mühür açık↔kapalı değişir. Mühürlü bir ok, geometrik çıkışı açık olsa da yalnızca mühür açıkken çıkarılabilir. Simgeler ve başlangıç durumu en baştan görünür; renk tek başına anlam taşımaz.

Basit düşünce örneği — henüz oyuna eklenmedi:

| Parça | Geometrik koşul | Durum etkisi |
|---|---|---|
| A | Başlangıçta çıkarılabilir; C'nin önünü kapatır | Çıkınca mühürü değiştirir |
| B | Başlangıçta çıkarılabilir | Çıkınca aynı mühürü değiştirir |
| C | A kaldırılmış olmalı | Yalnızca açık mühürle çıkar; durum değiştirmez |

Mühür başlangıçta kapalıdır. **A → C → B** çözer. **B → A** geometrik olarak geçerlidir fakat iki anahtar tüketilirken mühür tekrar kapanır ve C kilitli kalır. **A → B** de aynı nedenle çıkmazdır. Oyuncu farkı bütün görünür bilgilerden çıkarabilir: önce C'nin önünü açmalı, mühür yeniden kapanmadan C'yi çıkarmalıdır. Bu, sadece geçerli oku bulmaktan farklı bir karardır.

Adalet koşulları:

- Anahtar etkisini tıklamadan önce açıklayabil; gizli dönüşüm, rastgele yön veya sonradan beliren kapı ekleme.
- Durum hatasını **ücretsiz tam geri alma** ile düzelt. Geri alma, silinen okları, mühür bitlerini ve oyun durumunu birebir geri getirsin; akıl yürütmeyi reklam/ödeme şartına bağlama.
- İlk öğretim örneği çok küçük olsun. İleri seviyede aynı kuralı iki mühür ve çapraz bağımlılıklarla birleştir; her bölümde yeni bir kural icat etme.
- İpucu, yalnızca geometrik olarak açık oku değil, kazanan devamı olan hamleyi seçsin. “Mühürü erken kapatma” gerekçesini açıklayabilsin.
- Sadece en sonda bir XOR/renk hedefi göstermek yeterli değildir: bütün anahtarlar bir kez tüketilirse son XOR sonucu sıradan bağımsızdır. Sıra hassasiyetini ara durumdaki kilitler yaratır.

## 8. İlk önerinin solver ve kalite ölçüleri

Yeni tam durum `s = (R, q)` olsun: `R` kalan oklar, `q` mühür bitleri. Bir hamle hem geometrik çıkışı hem görünür mühür koşulunu sağlamalıdır; ardından ok silinir ve varsa bitler XOR ile değiştirilir. Her başarı bir oku tükettiği için arama derinliği sonludur. Memoize edilmiş bir durum solver'ı kazanılabilirliği doğrulamalı; araştırma bütçesi aşılırsa aday “kanıtlanmadı” diye reddedilmelidir.

Bir durumdaki uygulanabilir hamleler `A(s)`, kazanan devamı olanlar `W(s)` olsun. Gerçek karar noktası **`|A| ≥ 2` ve `0 < |W| < |A|`** koşulunu taşır. İleri bölümlerde yalnızca bu noktaların sayısı değil, görünen mühür/engelleme ilişkilerinin kaç adım boyunca takip edildiği de artmalıdır. Çok sayıda bağımsız normal okun sırası farklı diye “binlerce çözüm” saymak veya tüm çözümü tek sıraya zorlamak yanıltıcıdır; anlamlı anahtar kararlarını ayrı say.

Ölçek için öneri: durum değiştirmeyen ve şu anda açık olan normal okları solver içinde güvenli bir kapanış olarak sadeleştirmek mümkündür; bunları erken kaldırmak engel eklemez veya mühür değiştirmez. Ancak **oyuncunun gerçek bir anahtar hamlesini sınıflandırırken önce o hamleyi gerçek durumdan uygula**, sonra sadeleştir. Önceden bütün açık normal okları varsayımsal olarak kaldırmak, erken anahtarın tehlikesini gizler. Oyuncu tarafında normal oklar otomatik kaldırılmaz.

| Seviye aralığı | Öğrenme / mantık hedefi | Görsel hedef |
|---|---|---|
| 1–5 | İlk iki yön öğretimi; küçük tek mühür problemi ve ilk gerçek sıra ayrımı | Küçük, tamamen görünen tahta |
| 6–10 | Tek mühür; anahtarı doğru anda tüketme, 2–3 kritik karar | Ok sayısından bağımsız belirgin yapılar |
| 11–20 | İki görünür mühür; bir dalın diğerini açması | Az sayıda belirgin özel simge |
| 21–30 | Birbirine bağlı zincirler, 3–4 adımlı görünür çıkarım hedefi | Başların ve bütün çıkışların izlenebilmesi |
| 31–40 | İki mühürü birlikte etkileyen anahtarlar, tekrar kullanılan motiflerin yeni birleşimleri | Gösteriş yerine tutarlı simge dili |
| 41–50 | Birkaç gerçek kararın etkileşmesi; geç bölümde yeni başlayan seviyeye düşmeme | Daha kalabalık değil, daha derin ve okunaklı |

Bu sayılar henüz doğrulanmış insan zorluğu veya uygulanmış bölüm sertifikası değildir. Her adayda çözüm kanıtı, kritik karar sayısı, örnek yanlış geçerli hamle, görünür gerekçe ve aynı kuralı öğreten önkoşul kaydedilmeli. Bölüm etiketi o kayıttan türemeli. Solver'dan geçen kolay adaylar ayrıca elenmeli; sadece hedefi geçemeyenler değil.

Son kontrol, önceki elli bölümün kimliklerini koruyarak **her biri** için yapılmalı: yeni gerçek kararlar, kopya olmayan motif, 320/390 pikselde okunabilir sığdırma, kesin dokunma, geri alma doğruluğu ve öğrenilmiş kurallarla tahminsiz çözüm. Zor bölümü tanımlayan süre, hayat cezası veya ok yoğunluğu olmamalı. Süreli mod bir yan tercih olabilir; ana mantık deneyimi düşünmeye izin vermeli.

## 9. Araştırma aşamasındaki uygulama sırası önerisi

Önce küçük mühür örneğinin kurallarını ve solver sertifikasını doğrula; sonra erken/orta/geç üç temsilci bulmacayı gerçek oyuncu gibi çöz. Aynı anda ince çizgi + sade tahta denemesini değerlendir. Bu temsilciler anlaşılır ve tatmin edici olmadan elli aday üretme. Sonrasında tüm kampanyayı kalite eşiklerinden geçir, test/önizleme ve mevcut imzalı mağaza paketinin farklı sürümler olduğunu açıkça belirt. Bu belgede önerilen durum kuralı, halen eldeki eski imzalı pakette bulunmuyor.

## 10. Kaynakta uygulanan seçim: görünür tekrarlayan rune döngüsü

Seçilen kural, her ok için yeni bir aç/kapat etkisi öğrenmek yerine tek görünür diziyi izletir. Tahtanın üzerindeki kod döngüsü ve her oktaki dört geometrik simgeden biri baştan görülebilir. Bir ok hem çıkış ışını geometrik olarak açıkken hem de **sıradaki simgeyi taşıyorken** çıkarılabilir. Başarılı çıkarma kodu bir adım ilerletir. Aynı simgeyi taşıyan iki açık oktan hangisinin önce çıkarıldığı, sonraki simgenin önünü açıp açmamasına bağlı olarak çözümü koruyabilir veya çıkmaz yaratabilir. Böylece önceki monoton silmeye gerçek sıra seçimi eklenir; yanlış rune dokunması ile uygulanabilir fakat stratejik yanlış seçim ayrı durumlardır.

Kaynak sözleşmesi `js/rune-order.js`, `js/grid.js`, `js/rune-hud.js` ve `js/game.js` içindedir:

- Bölümün `runeCycle` dizisi 2–6 eleman içerir; her eleman `0..3` tamsayısıdır. Döngüde tekrar mümkündür ve kod dizisi oyuncuya gösterilir.
- Kodlu bölümde her `paths[i].rune`, aynı `0..3` aralığındaki görünür simgeyi tanımlar. Kampanya tasarımında ilk iki bölüm yön öğretimi olarak kodsuz, sonraki 48 bölüm kodludur; son veri üretimi/kalite sonuçları ayrıca doğrulanacaktır.
- Durum, çıkarılmış okların indeks kümesidir. Gereken rune `runeCycle[REMOVED sayısı % runeCycle.length]` olduğundan geçici çıkış animasyonu, başarısız dokunma ve yalnızca görsel önizleme kodu ilerletmez. Geri alma, ok durumunu ve bu sayacı birlikte geri getirir.
- Kodlu oyunlarda geri alma sınırsızdır; son 20 hamle sınırı uygulanmaz. İpucu geometrik açık bir oku gelişigüzel seçmek yerine **kazanan devamı kesin olarak kanıtlanmış `safeMoves`** içinden seçer. Bu bir kaynak davranışı kaydıdır; bu belgede gerçek ödeme/reklam akışı test edildiği iddia edilmez.
- `createRuneSolver(level).analyze(removedIndices)` gerçek uygun seçenekleri (`legalMoves`) ve kazanan devamı olan seçenekleri (`safeMoves`) ayrı döndürür. Bit maskesi `BigInt` kullanır; 32 ok sınırı yoktur. Geometrik çıkış bağımlılıkları bir kez derlenir, durumlar memoize edilir.
- Varsayılan bütçe **20.000 durumdur**. Bütçe aşımı `status:'unknown'`, `solvable:null`, boş `safeMoves/solution` sonucudur; başarısız çözüm veya güvenli ipucu diye sunulmaz. Yeni bölüm üretimi bu sonucu reddeder.
- Zorluk ölçüsü `minimumCriticalDecisions`, **bütün kazanan rotalar içindeki en az kritik seçim sayısıdır**. Bir kritik durumda hem güvenli hem kaybettiren uygun hamle bulunur. `maximumCriticalDecisions` ayrıca raporlanır fakat kolay rotayı gizleyen bir sertifika olarak kullanılmaz. Kaydedilen solver rotası da en kolay kazanan rota olduğundan `criticalDecisionsOnSolution` minimumla eşit olmalıdır. Yanlış seçimin ardından en erken çıkmaza kadar olan mesafe ve uygun seçeneklerin tehlikeli oranı yardımcı ölçülerdir.

Bu seçim; okun görünür yönünü, silme animasyonunu ve hücre/yol tabanlı dokunmayı korurken az sayıda yeni simgeyle açıklanabilir. Mühür/XOR önerisinin normal okları otomatik sadeleştirme yaklaşımı yeni döngüye taşınmadı: kodlu her başarılı çıkarma fazı değiştirdiğinden, açık bir oku varsayımsal olarak erken silmek güvenli kabul edilemez.

Bu kural **güncellenen kaynakta** bulunur. Önceki `main49/Game6/SW35` imzalı 1.1.0(148) IPA bu yeni kurala sahip değildir. Solver derecesi, gözlenmiş insan zorluğu veya tahminsiz çözülebilirlik sertifikası yerine geçmez; görünür kod ilişkilerinin gerçek oyun kontrolü de gerekir.

## 11. İlk rune kampanyası adayının ölçülen sonuçları

İlk statik rune kampanyası adayı, aynı 50 kayıt kimliğini, bölüm adlarını ve 47 ayrı şekil kimliğini korur; ok gruplanması, boyutlar ve sıra kuralları yeniden yazılmıştır. **İlk iki bölüm 10/16 oklu kodsuz öğretim, diğer 48 bölüm kodlu**; toplam **2.082 ok**, en büyük boyut **26×28**'dir. Bu sayılar rakip verisi veya mağazaya yüklenmiş içerik değil, ilk yerel rune adayının ölçümüdür. Kullanıcının gerçek oynanışta geç bölümleri yine kolay bulması üzerine bu adayın zorluk derecesi aşağıdaki derinlik incelemesiyle yeniden değerlendirildi.

| Medeniyet sırası | Ok sayısı aralığı | En kolay kazanan rotada kritik karar aralığı | Bölüm ortalaması |
|---|---:|---:|---:|
| Mısır | 10–18 | 0–4 | 1.6 |
| Yunan | 19–28 | 3–6 | 4.2 |
| Roma | 25–33 | 3–9 | 5.0 |
| Viking | 29–38 | 5–7 | 5.8 |
| Osmanlı | 36–44 | 5–24 | 9.8 |
| Çin | 40–52 | 7–18 | 11.0 |
| Maya | 45–55 | 6–21 | 11.2 |
| Hindistan | 50–60 | 7–15 | 11.2 |
| Ortaçağ | 55–65 | 9–20 | 13.2 |
| Final | 57–75 | 9–30 | 18.0 |

Ortalama gerçek karar yükü medeniyetler arasında gerilemez; eşit kalan iki geçiş vardır. Bu, her komşu bölümün insan için kesin daha zor olduğu iddiası değildir. Bütün kodlu bölüm minimumları hedeflerini karşılar; ilk iki kodsuz bölümün hedefi sıfırdır. Yardımcı **en kolay rota yanlış-hamle ufku medyanı** hedefinde iki istisna açıkça kayıtlıdır: `greek_5` için 3 hedefe karşı 2, `china_3` için 3 hedefe karşı 2.5. Bu istisnalar minimum gerçek karar testini gevşetmez.

`tests/redesign-puzzles.mjs`, gerçek `Grid` ile 50 kaydedilmiş çözümü ve **1.000 değişken tam güvenli seçim çözümünü** tamamladı. Her kodlu bölümde uygun fakat kaybettiren bir hamle seçildi, gerçek çıkmaza kadar oynandı, ters sırada bütün yanlış dal geri alındı ve geri kazanılan güvenli çözüm tamamlandı: **48 yanlış seçim, 48 çıkmaz, 48 tam geri dönüş**. Geometrik uygunluk ile rune fazı **45.448 durum kontrolünde** solver'ın gerçek `legalMoves` kümesiyle karşılaştırıldı. Bütçe aşımının `unknown` kalması ayrıca kontrol edildi.

`tests/level-audit.mjs`, yalnızca geçerli hamle varlığını raporlamak yerine hata halinde başarısız olur. Geometrik döngüsüzlük/çakışma/sınır/yol sürekliliği ve 50 gerçek kodlu/kodsuz kayıtlı çözüm korunur. Solver'ın sınıflandırma API'si üzerinden ayrı bir recurrence, **25.330 kazanan durumu** gezerek tüm kazanan rotaların minimumunu, maksimumunu ve çözüm sayısını yeniden hesapladı; statik `runeAudit` sertifikalarıyla eşitliği doğruladı. Minimum 0, maksimum 1 ve dört kazanan sıralı ayrı bir regresyon düzeni, en zor rotanın kolay rota yerine derecelendirilmesini engeller. Tam erişilebilir durum sayısı en yoğun gerçek bölümde **11.900** olduğundan 20.000 durum sınırı içinde kanıtlandı.

Geometri testi üç ekran pozunda 50 bölümün ilk şekle sığmasını, odak koruyan yön değişimini ve ok silindikçe şeklin yeniden küçülmemesini doğruladı: her biri **150 kontrol**; gerçek ok başında **6.246 kesin yol sahipliği** kontrolü. Bu canvas/hesap kontrolleri fiziksel dokunma veya Duo katlanma testi yerine geçmez. Yoğun tam tahta görünümünde çizgi pikseli dokunma hedefi olarak sayılmaz; büyütme/pan yolu ve küçük hücrelerde yakınlaştırma yönlendirmesi ayrıca gerçek oyun akışında kontrol edilir.

Her iki test ayrı süreçte, 20 saniye sınırıyla normal **çıkış kodu 0** verdi; süreler yaklaşık 2.05 ve 0.28 saniyeydi. Ham kanıtlar `outputs/qa/rune-redesign-owned-test.log`, `outputs/qa/rune-level-audit-owned-test.log`, yazar sertifikası `outputs/qa/rune-campaign-authoring.json` içindedir. Bu kaynak kanıtları, yeniden native paketleme/cihaz testi veya App Store gönderimi yapıldığı anlamına gelmez.

## 12. Gerçek oynanış geri bildirimi: karar adedi derinlik değildir

İlk adayın 48 kodlu bölümünde, en kolay kritik-karar rotasının adımlarının **%49.4'ü tek uygun hamleli**; incelenen yanlış seçeneklerin **%24.7'si bir sonraki rune'da hemen çıkmaza** giriyordu. 455 kritik durumun 97'sinde bütün yanlış seçenekler bu tek sonraki faz kontrolüyle elenebiliyordu. Son `final_5` bölümünde 30 minimum kritik karar bulunmasına rağmen, kanıtlanan minimum altı ve sekiz hamlelik derin karar sayısı **0/0** idi. Kullanıcının “hâlâ kolay” geri bildirimiyle bu ölçümler uyumludur; yüksek sayaç sonucu geri bildirimi geçersiz kılmaz.

Yeni ölçü, yanlış hamle dahil en erken çıkmazın en az `h` hamle uzakta olduğu bir yanlış seçenek barındıran kararları sayar. `minimumDeepCriticalDecisions[h]`, bu sayının **bütün kazanan çözümler üzerindeki minimumudur**; yalnızca örnek rotanın medyanına bakılmaz. Bağımsız pencere kontrolü ayrıca, yanlış hamleden sonraki `h−1` adım içinde başka bir uygun seçim noktası bulunmasını sınar. Böylece uzun, tamamen tek yollu bekleme zincirinin derin planlama diye sunulması önlenir.

| İncelenen örnek | Minimum derin karar H4/H6/H8 | Yanlış dalın her devamında pencere içinde ek seçim şartıyla minimum H6/H8 | Örnek kazanan rotada tek uygun hamle oranı |
|---|---:|---:|---:|
| İlk aday `final_1` | 6 / 0 / 0 | 0 / 0 | %24.6 |
| İlk aday `final_3` | 1 / 0 / 0 | 0 / 0 | %64.7 |
| İlk aday `final_5` | 7 / 0 / 0 | 0 / 0 | %48.0 |
| Dört ayrı geometrik zincir, ortak rune sırası — deney, 75 ok | 6 / 6 / 2 | 6 / 2 | %65.3 |
| Tahtaya gömülmüş zincirler — deney, 75 ok | 4 / 3 / 2 | 2 / 2 | %80.0 |
| Gerçek hücre yollarında üç mühür — ilk aktarım, deney, 75 ok | 8 / 5 / 3 | 3 / 3 | %72.0 |
| Aynı üç mühür geometrisi — 12.000 atama aramasının seçimi, deney, 75 ok | 6 / 5 / 3 | 4 / 3 | %76.0 |

Tablodaki ek-seçim sütunu, yalnız zorunlu beklemeyle açıklanamayan altı/sekiz hamlelik kararları ayırır. Bununla birlikte deneylerde çok sayıda tek hamleli adım kalır. Bütün kazanan rotalar içindeki en uzun **kritik kararsız kesintisiz aralık**, dört zincirde 16, gömülü zincirde 41, ilk üç mühür aktarımında 16, 12.000 atamalı üç mühür seçiminde 26 hamledir. Derin karar tabanı, bu boş aralıkları tek başına engellemez. Üç mühür örneğinin 75 gerçek hücre yolunda her çıkış ışını ayrı tarandı; zincirlerin bütün **17.576** geçerli ön-ek durumu kontrol edilerek üç bağımsız 25 oklu geometrik ilerleme doğrulandı. Bu bir cihaz testi değildir. 12.000 atamalı seçimin minimum kritik karar sayısı 10 ve H6 sayısı 5 olduğundan yapılandırılmış 12/6 hedeflerini tamamen karşıladığı söylenemez.

Yeni bölüm hedefi, geç bölümlerde bütün kazanan rotalara derin karar tabanı koymak, bu kararları tahtaya dağıtmak ve zorunlu boş adımları azaltmaktır. Daha fazla ok veya daha kısa süre zorluk kanıtı değildir. Aynı sıradaki iki görünür seçeneğin kısa vadede ikisi de ilerleyebilmeli; birini erken tüketmek ilerideki farklı rune çıkışını bozmalıdır. Bütün gerekli bilgi baştan görünür ve tam geri alma ücretsiz kalır.

Bu tablodaki prototipler, kaynak kampanya olarak doğrudan yayımlanmadı; son seçilen kaynak seti bölüm 13'te ayrıdır. Ham karşılaştırma ve bağımsız hesap `outputs/experiments/rune-independent-depth-qa.mjs/json`, ilk adayın örnek-rota dağılımı `outputs/qa/rune-depth-first-candidate.json` içindedir. Karşılaştırma scripti, eski adayı `rune-campaign-preview.json` anlık kaydından okur; güncel kaynak değişince eski sonuçlara yeni bölüm verisi karıştırılmaz. Deneylerin matematiksel derecesi insan oynanışının yerine geçmez.

## 13. İkinci kaynak kampanyası: sıkı derinlik ve boş aralık sınırları

Üretim tamamlandı ve 50 bölümün tanımlı eşikleri kanıtlandı. Mısır'ın beş giriş düzeni korundu; **Yunan'dan Final'e 45 tahta**, görünür rune koduyla birbirine bağlı üç geometrik mühür olarak yeniden yazıldı. İlk iki bölüm kodsuz, kalan 48 bölüm kodludur. Toplam **2.109 ok**, yeni tahtalarda en fazla **23×32** hücre vardır. Bölüm kayıt kimlikleri/adları ve medeniyet temaları korunur; son 45 tahta için “47 farklı tarihî siluet” iddiası yapılmaz. `boardCells`, gerçek yeni mühür yollarının tamamını ve çizim sınırını tanımlar.

| Medeniyet sırası | Bütün kazanan çözümlerin derin karar tabanı | Ek dallanma tabanı | En uzun kritik kararsız aralık sınırı |
|---|---|---|---:|
| Yunan–Çin (2–6) | H4 ≥ 3 | — | 18 |
| Maya (7) | H4 ≥ 3, H6 ≥ 2 | H6 ≥ 1 | 20 |
| Hindistan (8) | H6 ≥ 3 | H6 ≥ 1 | 20 |
| Ortaçağ (9) | H6 ≥ 4 | H6 ≥ 1 | 20 |
| Final (10) başlangıç | H6 ≥ 4 | H6 ≥ 1 | 20 |
| Final sonraki dört bölüm | H6 ≥ 5; son bölümde ayrıca H8 ≥ 3 | H6 ≥ 1 | 20 |

Final'in ilk bölümünde dört, sonraki bölümlerinde beş derin H6 kararı, açıkça seçilmiş zorluk rampasıdır. Ek dallanma ölçüsü artık daha sıkıdır: yanlış hamleden sonraki **en fazla ilk dört adım** içinde, yanlış dalın **her devamında** başka bir uygun seçim gerektirir; H4 için pencere üç adımdır. Bu eşikler, bölüm yazarının tahmini etiketlerinden ayrı olarak testte de sabittir. Arama `unknown` verirse veya herhangi bir hedef karşılanmazsa generatör üretim verisini yazmayı reddeder.

Son medeniyette ölçülen minimum H6 kararları **[4, 6, 5, 6, 5]**; en uzun kritik kararsız aralıklar **[18, 20, 16, 20, 16]**'dır. Son bölümün minimum H8 değeri **3**, H6/H8 ek-dallanma minimumları **1/1**'dir. 45 yeni tahtanın bütün kazanan rotalarında en uzun boş aralık en fazla 20'dir. Örnek en kolay kritik-karar rotalarında hamlelerin yaklaşık **%67.8'i tek uygun seçenekli** kalır; bu sayı da açıkça kaydedilir. İnsan için düşünme kalitesi veya her hamlede seçim varlığı bu sertifikadan çıkarılmaz.

Son iki test ayrı süreçte, 20 saniye sınırında normal çıkış kodu 0 verdi: yaklaşık **1.94 / 0.19 saniye**. 50 kayıtlı çözüm ve **20 seçim tohumu × 50 bölüm = 1.000 tam güvenli çözüm denemesi**, **45.929 gerçek Grid/rune durumu**, **48 yanlış hamle→çıkmaz→tam geri alma→çözüm** doğrulandı. Bu, 1.000 birbirinden farklı çözüm sırası olduğu iddiası değildir; bazı bölümlerin güvenli sırası tek olabilir. Bağımsız recurrence **3.547 kazanan durumda** min/max derinlik, min/max dört-adımlık ek dallanma, en uzun boş/zorunlu hamle aralıkları, bütün erişilebilir kazanan durumların yanlış-hamle mesafe histogramı ve statik `runeAudit` sertifikalarını karşılaştırdı. Yeni kodlu tahtada en büyük kanıtlanan erişilebilir küme **499 durumdur**; eski kodsuz giriş dahil toplam en büyük küme 584'tür.

Renderer'a gerçek `boardCells` verilerek 150 sığdırma, 150 odağı koruyan yeniden boyutlandırma, 150 silme sonrası sabit ilk-footprint kontrolü ve **6.327 kesin ok başı sahipliği** testi geçti. Ham final kaynak kanıtları `outputs/qa/rune-seal-redesign-owned-test.log`, `outputs/qa/rune-seal-level-audit-owned-test.log`, `outputs/qa/rune-deep-campaign-authoring.json` ve deney dosyasının ayrı `production` bölümü içindedir.

Bu bölüm yerel kaynak/test kanıtıdır. Yeni kampanyanın fiziksel dokunma, Duo katlanma veya native paket/mağaza yükleme sonucu olduğu söylenmez. Gerçek oynanış geri bildirimi ayrıca değerlendirilir; önceki imzalı main49/Game6/SW35 IPA bu kaynak kampanyasını içermez.
