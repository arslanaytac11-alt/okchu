// js/data/chapters.js

export const chapters = [
    {
        id: 1,
        name: 'Misir',
        difficulty: 'Kolay',
        story: {
            title: 'Antik Misir',
            period: 'M.O. 3100 - M.O. 30',
            text: 'Firavunlarin topraginda piramitler gokyuzune uzanir. Hiyeroglif yazitlar binlerce yildir cozulmemis sirlar barindirir. Nil\'in bereketli topraklarinda kurulan bu medeniyet, insanlik tarihinin en buyuleyici yapilarini birakti.',
            mystery: 'Piramitlerin icindeki gizli odalarda saklanan ok isaretlerini coz ve firavunun hazinesine ulasan yolu bul!',
            image: 'assets/chapters/chapter_1.jpg'
        },
        theme: {
            background: '#e8dcc0',
            backgroundGradient: ['#f0e4c8', '#d8c8a0'],
            gridDot: 'rgba(120,100,60,0.08)',
            arrowIdle: '#4a3820',
            arrowRemovable: '#4a3820',
            arrowRemoving: '#a03020',
            arrowRemoved: 'rgba(120,100,60,0.1)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#b08020',
            removableGlow: 'rgba(100,70,30,0.12)',
        }
    },
    {
        id: 2,
        name: 'Yunan',
        difficulty: 'Orta',
        story: {
            title: 'Antik Yunanistan',
            period: 'M.O. 800 - M.O. 146',
            text: 'Felsefenin, demokrasinin ve olimpiyatlarin dogdugu topraklar. Beyaz mermer tapinaklarda tanrilara adanan eserler, Akdeniz\'in mavisinde yansiyan sutunlar. Sokrates\'ten Arkhimedes\'e, dusuncenin altun caginda bilgelik her yerdeydi.',
            mystery: 'Parthenon\'un mermer sutunlari arasinda gizlenmis ok isaretlerini takip et ve tanrilarin bilmecesini coz!',
            image: 'assets/chapters/chapter_2.jpg'
        },
        theme: {
            background: '#e0dcd0',
            backgroundGradient: ['#eae6d8', '#d0ccc0'],
            gridDot: 'rgba(100,100,120,0.08)',
            arrowIdle: '#2a3048',
            arrowRemovable: '#2a3048',
            arrowRemoving: '#a03020',
            arrowRemoved: 'rgba(100,100,120,0.08)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#4a80b0',
            removableGlow: 'rgba(40,50,80,0.1)',
        }
    },
    {
        id: 3,
        name: 'Roma',
        difficulty: 'Zor',
        story: {
            title: 'Roma Imparatorlugu',
            period: 'M.O. 753 - M.S. 476',
            text: 'Kolezyum\'da yankilanan alkislar, su kemerlerinden akan muhendislik harikasi, tum yollarin Roma\'ya ciktigi bir imparatorluk. Gladyatorlerin cesareti ve senatonun entrikalari bu devasa imparatorlugun iki yuzuydu.',
            mystery: 'Kolezyum\'un karanlik koridorlarinda kaybolmus ok haritasini coz ve gladyatorun ozgurluk yolunu ac!',
            image: 'assets/chapters/chapter_3.jpg'
        },
        theme: {
            background: '#e4d8c0',
            backgroundGradient: ['#ecdcc4', '#d4c4a8'],
            gridDot: 'rgba(120,90,60,0.08)',
            arrowIdle: '#3a2818',
            arrowRemovable: '#3a2818',
            arrowRemoving: '#a03020',
            arrowRemoved: 'rgba(120,90,60,0.08)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#a07030',
            removableGlow: 'rgba(80,50,20,0.1)',
        }
    },
    {
        id: 4,
        name: 'Viking',
        difficulty: 'Zor+',
        story: {
            title: 'Viking Cagi',
            period: 'M.S. 793 - M.S. 1066',
            text: 'Buzul fiyortlardan yelken acan ejderha gemiler, runik taslar uzerine kazinmis kehanetler. Kuzeyin korkusuz savascilar sadece fethetmek icin degil, yeni diyarlar kesfetmek icin de denizlere acildi. Thor\'un cekici gokyuzunde gumburduyor.',
            mystery: 'Runik taslardaki ok sembollerini dogru sirada coz ve Viking hazine haritasinin sirrini ac!',
            image: 'assets/chapters/chapter_4.jpg'
        },
        theme: {
            background: '#dce0e8',
            backgroundGradient: ['#e4e8f0', '#ccd0d8'],
            gridDot: 'rgba(80,90,110,0.08)',
            arrowIdle: '#283040',
            arrowRemovable: '#283040',
            arrowRemoving: '#a03020',
            arrowRemoved: 'rgba(80,90,110,0.08)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#5888a8',
            removableGlow: 'rgba(40,50,70,0.1)',
        }
    },
    {
        id: 5,
        name: 'Osmanli',
        difficulty: 'Cok Zor',
        story: {
            title: 'Osmanli Imparatorlugu',
            period: 'M.S. 1299 - M.S. 1922',
            text: 'Uc kitaya hukmeden muhtesem imparatorluk. Camilerin kubbeleri altin isikla parlar, tezhip sanati kagidi mucevhere cevirir. Istanbul\'un siluetinde minareler gokyuzunu deler, Topkapi Sarayi\'nda sirlar fisildanir.',
            mystery: 'Topkapi Sarayi\'nin muhurlu avlusunda saklanan gecitleri ac, kubbelerin altindaki isaretleri cozumle ve kayip fermanin izini sur!',
            image: 'assets/chapters/chapter_5.jpg'
        },
        theme: {
            background: '#dbc7be',
            backgroundGradient: ['#f6e6d9', '#b99b93'],
            gridDot: 'rgba(88,28,46,0.14)',
            arrowIdle: '#531b31',
            arrowRemovable: '#531b31',
            arrowRemoving: '#c88727',
            arrowRemoved: 'rgba(83,27,49,0.12)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#0d6c67',
            removableGlow: 'rgba(13,108,103,0.18)',
            surface: 'rgba(255,248,242,0.5)',
            surfaceStrong: 'rgba(255,248,242,0.82)',
            borderColor: 'rgba(83,27,49,0.24)',
            lifeAlive: '#b53b52',
            lifeGlow: 'rgba(181,59,82,0.34)',
            patternColor: 'rgba(13,108,103,0.14)',
        }
    },
    {
        id: 6,
        name: 'Cin',
        difficulty: 'Cok Zor+',
        story: {
            title: 'Antik Cin',
            period: 'M.O. 2070 - M.S. 1912',
            text: 'Cin Seddi ufukta kaybolur, ipek yolu dunya medeniyetlerini birbirine baglar. Ejderha efsaneleri bulutlarin arasinda saklanir, pagoda kuleleri gogu deler. Barut, kagit ve pusula - bu topraklardan dunyaya yayildi.',
            mystery: 'Yasak Sehir\'in gizli odasindaki ejderha haritasini coz ve imparatorun kayip muhurunu bul!',
            image: 'assets/chapters/chapter_6.jpg'
        },
        theme: {
            background: '#e8d8d0',
            backgroundGradient: ['#f0e0d4', '#d8c8bc'],
            gridDot: 'rgba(140,80,60,0.08)',
            arrowIdle: '#3a2020',
            arrowRemovable: '#3a2020',
            arrowRemoving: '#c04030',
            arrowRemoved: 'rgba(140,80,60,0.08)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#a06040',
            removableGlow: 'rgba(80,30,30,0.1)',
        }
    },
    {
        id: 7,
        name: 'Maya',
        difficulty: 'Efsanevi',
        story: {
            title: 'Maya Medeniyeti',
            period: 'M.O. 2000 - M.S. 1500',
            text: 'Ormanin derinliklerinde gokyuzune yukselen tas piramitler, yildizlari izleyen rasathaneler. Maya takvimi zamani olcmekte inanilmaz derecede hassasti. Jaguarin gozleri karanlikta parlar, gunes tanrisi tapinagindan izler.',
            mystery: 'Ormanin icindeki gizli tapinakta Maya takviminin ok sembollerini coz ve gunes tutulmasinin sirrini ac!',
            image: 'assets/chapters/chapter_7.jpg'
        },
        theme: {
            background: '#dce4d8',
            backgroundGradient: ['#e4ecd8', '#ccd4c8'],
            gridDot: 'rgba(60,100,60,0.08)',
            arrowIdle: '#1e3020',
            arrowRemovable: '#1e3020',
            arrowRemoving: '#a03020',
            arrowRemoved: 'rgba(60,100,60,0.08)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#608040',
            removableGlow: 'rgba(30,60,30,0.1)',
        }
    },
    {
        id: 8,
        name: 'Hint',
        difficulty: 'Efsanevi+',
        story: {
            title: 'Antik Hindistan',
            period: 'M.O. 3300 - M.S. 1800',
            text: 'Tac Mahal\'in beyaz mermeri ay isiginda parlar, Ganj Nehri kutsal sularini tasir. Mandala desenleri sonsuzlugu simgeler, lotus cicekleri bilgeligi temsil eder. Yoga ve meditasyonun dogdugu bu kadim topraklar ruhani derinlik tasir.',
            mystery: 'Tac Mahal\'in gizli bahcesindeki lotus desenlerinin arasina gizlenmis ok yollarini coz ve Mogol hazinesini bul!',
            image: 'assets/chapters/chapter_8.jpg'
        },
        theme: {
            background: '#e8dcc4',
            backgroundGradient: ['#f0e4cc', '#d8ccb0'],
            gridDot: 'rgba(140,100,50,0.08)',
            arrowIdle: '#3a2818',
            arrowRemovable: '#3a2818',
            arrowRemoving: '#a03020',
            arrowRemoved: 'rgba(140,100,50,0.08)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#b08030',
            removableGlow: 'rgba(80,50,20,0.1)',
        }
    },
    {
        id: 9,
        name: 'Ortacag Avrupa',
        difficulty: 'Kabus',
        story: {
            title: 'Ortacag Avrupasi',
            period: 'M.S. 500 - M.S. 1500',
            text: 'Karanlik cagda kaleler sisli tepelerde yukselir, sovalyelerin kilici ay isiginda parlar. Gotik katedrallerin vitray camlari hikayeler anlatir, simyacilar altin arar. Antik haritalar bilinmeyen topraklara isaret eder.',
            mystery: 'Simyacinin labirent gibi kalesindeki ok isaretlerini coz ve efsanevi felsefe tasinin formulunu ac!',
            image: 'assets/chapters/chapter_9.jpg'
        },
        theme: {
            background: '#d8d8dc',
            backgroundGradient: ['#e0e0e4', '#c8c8cc'],
            gridDot: 'rgba(80,80,90,0.08)',
            arrowIdle: '#282830',
            arrowRemovable: '#282830',
            arrowRemoving: '#a03020',
            arrowRemoved: 'rgba(80,80,90,0.06)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#707080',
            removableGlow: 'rgba(40,40,50,0.1)',
        }
    },
    {
        id: 10,
        name: 'Final',
        difficulty: 'Kabus+',
        story: {
            title: 'Medeniyetlerin Bulusmasi',
            period: 'Zamansiz',
            text: 'Tum antik medeniyetlerin bilgeligi tek bir noktada bulusuyor. Piramitlerin altini, pagodanin kirmizisi, mermer beyazi, runik mavisi... Her kultur kendi parcasini birakti. Simdi tum parcalar bir araya gelmeli.',
            mystery: 'Tum medeniyetlerin biraktigi ok isaretlerini birlestir ve insanligin en buyuk sirrini coz!',
            image: 'assets/chapters/chapter_10.jpg'
        },
        theme: {
            background: '#e0dce4',
            backgroundGradient: ['#e8e4ec', '#d0ccd8'],
            gridDot: 'rgba(100,80,120,0.08)',
            arrowIdle: '#282038',
            arrowRemovable: '#282038',
            arrowRemoving: '#a03020',
            arrowRemoved: 'rgba(100,80,120,0.06)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#806098',
            removableGlow: 'rgba(50,30,70,0.1)',
        }
    }
];
