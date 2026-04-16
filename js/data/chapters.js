// js/data/chapters.js

export const chapters = [
    {
        id: 1,
        name: 'Mısır',
        difficulty: 'Kolay',
        story: {
            title: 'Antik Mısır',
            period: 'M.Ö. 3100 - M.Ö. 30',
            text: 'Firavunların topraklarında piramitler gökyüzüne uzanır. Hiyeroglif yazıtlar binlerce yıldır çözülmemiş sırlar barındırır. Nil\'in bereketli topraklarında kurulan bu medeniyet, insanlık tarihinin en büyüleyici yapılarını bıraktı.',
            mystery: 'Piramitlerin içindeki gizli odalarda saklanan ok işaretlerini çöz ve firavunun hazinesine ulaşan yolu bul!',
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
            particleColors: ['#d4a843', '#2b8a9a'],
        }
    },
    {
        id: 2,
        name: 'Yunan',
        difficulty: 'Orta',
        story: {
            title: 'Antik Yunanistan',
            period: 'M.Ö. 800 - M.Ö. 146',
            text: 'Felsefenin, demokrasinin ve olimpiyatların doğduğu topraklar. Beyaz mermer tapınaklarda tanrılara adanan eserler, Akdeniz\'in mavisinde yansıyan sütunlar. Sokrates\'ten Arşimet\'e, düşüncenin altın çağında bilgelik her yerdeydi.',
            mystery: 'Parthenon\'un mermer sütunları arasında gizlenmiş ok işaretlerini takip et ve tanrıların bilmecesini çöz!',
            image: 'assets/chapters/chapter_2.jpg'
        },
        theme: {
            background: '#e0dcd0',
            backgroundGradient: ['#eef0f8', '#d4d8e8'],
            gridDot: 'rgba(100,100,120,0.08)',
            arrowIdle: '#1a2848',
            arrowRemovable: '#2a3048',
            arrowRemoving: '#a03020',
            arrowRemoved: 'rgba(100,100,120,0.08)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#4a80b0',
            removableGlow: 'rgba(40,50,80,0.1)',
            particleColors: ['#ffffff', '#4a80b0'],
        }
    },
    {
        id: 3,
        name: 'Roma',
        difficulty: 'Zor',
        story: {
            title: 'Roma İmparatorluğu',
            period: 'M.Ö. 753 - M.S. 476',
            text: 'Kolezyum\'da yankılanan alkışlar, su kemerlerinden akan mühendislik harikası, tüm yolların Roma\'ya çıktığı bir imparatorluk. Gladyatörlerin cesareti ve senatonun entrikaları bu devasa imparatorluğun iki yüzüydü.',
            mystery: 'Kolezyum\'un karanlık koridorlarında kaybolmuş ok haritasını çöz ve gladyatörün özgürlük yolunu aç!',
            image: 'assets/chapters/chapter_3.jpg'
        },
        theme: {
            background: '#e4d8c0',
            backgroundGradient: ['#f0dcc4', '#d8c0a0'],
            gridDot: 'rgba(120,90,60,0.08)',
            arrowIdle: '#5a1810',
            arrowRemovable: '#3a2818',
            arrowRemoving: '#a03020',
            arrowRemoved: 'rgba(120,90,60,0.08)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#c88020',
            removableGlow: 'rgba(80,50,20,0.1)',
            particleColors: ['#c04030', '#d4a843'],
        }
    },
    {
        id: 4,
        name: 'Viking',
        difficulty: 'Zor+',
        story: {
            title: 'Viking Çağı',
            period: 'M.S. 793 - M.S. 1066',
            text: 'Buzul fiyortlardan yelken açan ejderha gemiler, runik taşlar üzerine kazınmış kehanetler. Kuzeyin korkusuz savaşçıları sadece fethetmek için değil, yeni diyarlar keşfetmek için de denizlere açıldı. Thor\'un çekici gökyüzünde gümbürdüyor.',
            mystery: 'Runik taşlardaki ok sembollerini doğru sırada çöz ve Viking hazine haritasının sırrını aç!',
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
            particleColors: ['#c0c0c0', '#5888a8'],
        }
    },
    {
        id: 5,
        name: 'Osmanlı',
        difficulty: 'Çok Zor',
        story: {
            title: 'Osmanlı İmparatorluğu',
            period: 'M.S. 1299 - M.S. 1922',
            text: 'Üç kıtaya hükmeden muhteşem imparatorluk. Camilerin kubbeleri altın ışıkla parlar, tezhip sanatı kağıdı mücevhere çevirir. İstanbul\'un siluetinde minareler gökyüzünü deler, Topkapı Sarayı\'nda sırlar fısıldanır.',
            mystery: 'Topkapı Sarayı\'nın mühürlü avlusunda saklanan geçitleri aç, kubbelerin altındaki işaretleri çözümle ve kayıp fermanın izini sür!',
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
            particleColors: ['#8a2040', '#d4a843', '#0d6c67'],
        }
    },
    {
        id: 6,
        name: 'Çin',
        difficulty: 'Çok Zor+',
        story: {
            title: 'Antik Çin',
            period: 'M.Ö. 2070 - M.S. 1912',
            text: 'Çin Seddi ufukta kaybolur, ipek yolu dünya medeniyetlerini birbirine bağlar. Ejderha efsaneleri bulutların arasında saklanır, pagoda kuleleri göğü deler. Barut, kağıt ve pusula - bu topraklardan dünyaya yayıldı.',
            mystery: 'Yasak Şehir\'in gizli odasındaki ejderha haritasını çöz ve imparatorun kayıp mührünü bul!',
            image: 'assets/chapters/chapter_6.jpg'
        },
        theme: {
            background: '#e8d8d0',
            backgroundGradient: ['#f0d8d0', '#d8b8ac'],
            gridDot: 'rgba(140,80,60,0.08)',
            arrowIdle: '#5a1818',
            arrowRemovable: '#3a2020',
            arrowRemoving: '#c04030',
            arrowRemoved: 'rgba(140,80,60,0.08)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#208060',
            removableGlow: 'rgba(80,30,30,0.1)',
            particleColors: ['#c04030', '#d4a843'],
        }
    },
    {
        id: 7,
        name: 'Maya',
        difficulty: 'Efsanevi',
        story: {
            title: 'Maya Medeniyeti',
            period: 'M.Ö. 2000 - M.S. 1500',
            text: 'Ormanın derinliklerinde gökyüzüne yükselen taş piramitler, yıldızları izleyen rasathaneler. Maya takvimi zamanı ölçmekte inanılmaz derecede hassastı. Jaguarın gözleri karanlıkta parlar, güneş tanrısı tapınağından izler.',
            mystery: 'Ormanın içindeki gizli tapınakta Maya takviminin ok sembollerini çöz ve güneş tutulmasının sırrını aç!',
            image: 'assets/chapters/chapter_7.jpg'
        },
        theme: {
            background: '#dce4d8',
            backgroundGradient: ['#dcecd4', '#b8d0b0'],
            gridDot: 'rgba(60,100,60,0.08)',
            arrowIdle: '#143018',
            arrowRemovable: '#1e3020',
            arrowRemoving: '#a03020',
            arrowRemoved: 'rgba(60,100,60,0.08)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#209040',
            removableGlow: 'rgba(30,60,30,0.1)',
            particleColors: ['#408040', '#d4a843'],
        }
    },
    {
        id: 8,
        name: 'Hint',
        difficulty: 'Efsanevi+',
        story: {
            title: 'Antik Hindistan',
            period: 'M.Ö. 3300 - M.S. 1800',
            text: 'Tac Mahal\'in beyaz mermeri ay ışığında parlar, Ganj Nehri kutsal sularını taşır. Mandala desenleri sonsuzluğu simgeler, lotus çiçekleri bilgeliği temsil eder. Yoga ve meditasyonun doğduğu bu kadim topraklar ruhani derinlik taşır.',
            mystery: 'Tac Mahal\'in gizli bahçesindeki lotus desenlerinin arasına gizlenmiş ok yollarını çöz ve Moğol hazinesini bul!',
            image: 'assets/chapters/chapter_8.jpg'
        },
        theme: {
            background: '#e8dcc4',
            backgroundGradient: ['#f0e0c8', '#d8c4a8'],
            gridDot: 'rgba(140,100,50,0.08)',
            arrowIdle: '#2a1840',
            arrowRemovable: '#3a2818',
            arrowRemoving: '#a03020',
            arrowRemoved: 'rgba(140,100,50,0.08)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#c07020',
            removableGlow: 'rgba(80,50,20,0.1)',
            particleColors: ['#d48020', '#8040a0', '#d4a843'],
        }
    },
    {
        id: 9,
        name: 'Ortaçağ Avrupa',
        difficulty: 'Kabus',
        story: {
            title: 'Ortaçağ Avrupası',
            period: 'M.S. 500 - M.S. 1500',
            text: 'Karanlık çağda kaleler sisli tepelerde yükselir, şövalyelerin kılıcı ay ışığında parlar. Gotik katedrallerin vitray camları hikayeler anlatır, simyacılar altın arar. Antik haritalar bilinmeyen topraklara işaret eder.',
            mystery: 'Simyacının labirent gibi kalesindeki ok işaretlerini çöz ve efsanevi felsefe taşının formülünü aç!',
            image: 'assets/chapters/chapter_9.jpg'
        },
        theme: {
            background: '#d8d8dc',
            backgroundGradient: ['#d8d8e0', '#b8b8c0'],
            gridDot: 'rgba(80,80,90,0.08)',
            arrowIdle: '#181820',
            arrowRemovable: '#282830',
            arrowRemoving: '#a03020',
            arrowRemoved: 'rgba(80,80,90,0.06)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#c06020',
            removableGlow: 'rgba(40,40,50,0.1)',
            particleColors: ['#c0c0c0', '#c07030'],
        }
    },
    {
        id: 10,
        name: 'Final',
        difficulty: 'Kabus+',
        story: {
            title: 'Medeniyetlerin Buluşması',
            period: 'Zamansız',
            text: 'Tüm antik medeniyetlerin bilgeliği tek bir noktada buluşuyor. Piramitlerin altını, pagodanın kırmızısı, mermer beyazı, runik mavisi... Her kültür kendi parçasını bıraktı. Şimdi tüm parçalar bir araya gelmeli.',
            mystery: 'Tüm medeniyetlerin bıraktığı ok işaretlerini birleştir ve insanlığın en büyük sırrını çöz!',
            image: 'assets/chapters/chapter_10.jpg'
        },
        theme: {
            background: '#e0dce4',
            backgroundGradient: ['#e4d8ec', '#c8b8d8'],
            gridDot: 'rgba(100,80,120,0.08)',
            arrowIdle: '#1a1030',
            arrowRemovable: '#282038',
            arrowRemoving: '#a03020',
            arrowRemoved: 'rgba(100,80,120,0.06)',
            arrowWidth: 2.5,
            arrowHeadSize: 10,
            hintColor: '#806098',
            removableGlow: 'rgba(50,30,70,0.1)',
            particleColors: ['#d4a843', '#c04030', '#4a80b0', '#408040', '#8040a0'],
        }
    }
];
