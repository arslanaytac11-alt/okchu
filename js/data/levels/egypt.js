// js/data/levels/egypt.js
// Misir - Seviye 1-5 - Piramit, Ankh, Horus Gozu
// paths: her ok artik cok hucreli bir yol
// cells: [[x,y], [x,y], ...] - yolun hucreleri
// direction: ok ucunun yonu (son hucrenin cikis yonu)

export const egyptLevels = [
    {
        // Seviye 1 - Piramit sekli (baslangic)
        id: 'egypt_1',
        chapter: 1,
        level: 1,
        name: 'Seviye 1',
        gridWidth: 10,
        gridHeight: 10,
        paths: [
            // Piramit tepesi - ust yatay
            { cells: [[3,1],[4,1],[5,1],[6,1]], direction: 'right' },
            // Sol ust capraz
            { cells: [[2,2],[3,2]], direction: 'up' },
            // Sag ust capraz
            { cells: [[6,2],[7,2]], direction: 'right' },
            // Sol yan dikey
            { cells: [[1,3],[1,4],[1,5]], direction: 'down' },
            // Ust orta yatay
            { cells: [[3,3],[4,3],[5,3]], direction: 'left' },
            // Sag yan dikey
            { cells: [[8,3],[8,4],[8,5]], direction: 'down' },
            // Orta L sola
            { cells: [[5,4],[4,4],[3,4],[3,5]], direction: 'down' },
            // Orta L saga
            { cells: [[5,5],[6,5],[6,4]], direction: 'up' },
            // Alt sol yatay
            { cells: [[0,6],[1,6],[2,6],[3,6]], direction: 'left' },
            // Alt sag yatay
            { cells: [[6,6],[7,6],[8,6],[9,6]], direction: 'right' },
            // Alt orta dikey
            { cells: [[4,6],[4,7],[4,8]], direction: 'down' },
            // Alt orta 2
            { cells: [[5,7],[5,8]], direction: 'down' },
            // Taban yatay
            { cells: [[2,8],[3,8]], direction: 'left' },
            // Taban sag
            { cells: [[6,8],[7,8]], direction: 'right' }
        ]
    },
    {
        // Seviye 2 - Ankh (buyuk, L ve T sekilli yollar)
        id: 'egypt_2',
        chapter: 1,
        level: 2,
        name: 'Seviye 2',
        gridWidth: 10,
        gridHeight: 12,
        paths: [
            // Halka ust yatay
            { cells: [[3,0],[4,0],[5,0],[6,0]], direction: 'right' },
            // Halka sol dikey
            { cells: [[2,1],[2,2],[2,3]], direction: 'down' },
            // Halka sag dikey
            { cells: [[7,1],[7,2],[7,3]], direction: 'down' },
            // Halka ic sol
            { cells: [[3,1],[3,2]], direction: 'up' },
            // Halka ic sag
            { cells: [[6,1],[6,2]], direction: 'up' },
            // Halka alt kapanma
            { cells: [[3,3],[4,3],[5,3],[6,3]], direction: 'left' },
            // Sol kol
            { cells: [[0,5],[1,5],[2,5],[3,5],[4,5]], direction: 'left' },
            // Sag kol
            { cells: [[5,5],[6,5],[7,5],[8,5],[9,5]], direction: 'right' },
            // Govde ust
            { cells: [[4,4],[5,4]], direction: 'up' },
            // Govde orta sol
            { cells: [[4,6],[4,7],[4,8]], direction: 'down' },
            // Govde orta sag
            { cells: [[5,6],[5,7],[5,8]], direction: 'down' },
            // Govde alt L
            { cells: [[3,9],[4,9],[5,9],[6,9]], direction: 'right' },
            // Taban sol
            { cells: [[3,10],[3,11]], direction: 'down' },
            // Taban sag
            { cells: [[6,10],[6,11]], direction: 'down' },
            // Taban orta
            { cells: [[4,10],[5,10]], direction: 'down' }
        ]
    },
    {
        // Seviye 3 - Horus Gozu (karmasik, cok yol)
        id: 'egypt_3',
        chapter: 1,
        level: 3,
        name: 'Seviye 3',
        gridWidth: 12,
        gridHeight: 10,
        paths: [
            // Kas cizgisi (uzun yatay)
            { cells: [[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0]], direction: 'right' },
            // Sol ust cerceve
            { cells: [[0,1],[0,2],[0,3]], direction: 'down' },
            // Sag ust cerceve
            { cells: [[11,1],[11,2],[11,3]], direction: 'down' },
            // Goz ust sol
            { cells: [[1,2],[2,2],[3,2]], direction: 'left' },
            // Goz ust sag
            { cells: [[8,2],[9,2],[10,2]], direction: 'right' },
            // Goz ic sol L
            { cells: [[3,3],[3,4],[2,4],[1,4]], direction: 'left' },
            // Goz bebegi
            { cells: [[5,3],[6,3],[6,4],[5,4]], direction: 'left' },
            // Goz ic sag L
            { cells: [[8,3],[8,4],[9,4],[10,4]], direction: 'right' },
            // Goz alt sol
            { cells: [[1,5],[2,5],[3,5]], direction: 'left' },
            // Goz alt sag
            { cells: [[8,5],[9,5],[10,5]], direction: 'right' },
            // Sol alt cerceve
            { cells: [[0,4],[0,5],[0,6]], direction: 'down' },
            // Sag alt cerceve
            { cells: [[11,4],[11,5],[11,6]], direction: 'down' },
            // Goz yasi sol
            { cells: [[4,6],[4,7],[3,7],[3,8]], direction: 'down' },
            // Goz yasi sag
            { cells: [[7,6],[7,7],[8,7],[8,8]], direction: 'down' },
            // Goz yasi orta
            { cells: [[5,6],[6,6],[6,7],[5,7],[5,8],[6,8]], direction: 'down' },
            // Alt kenar
            { cells: [[0,9],[1,9],[2,9],[3,9]], direction: 'left' },
            // Alt kenar sag
            { cells: [[8,9],[9,9],[10,9],[11,9]], direction: 'right' }
        ]
    },
    {
        // Seviye 4 - Sfenks (yogun labirent)
        id: 'egypt_4',
        chapter: 1,
        level: 4,
        name: 'Seviye 4',
        gridWidth: 14,
        gridHeight: 10,
        paths: [
            // Bas ust
            { cells: [[2,0],[3,0],[4,0]], direction: 'up' },
            // Bas sol
            { cells: [[1,1],[1,2],[2,2]], direction: 'left' },
            // Bas sag
            { cells: [[5,1],[5,2],[4,2]], direction: 'right' },
            // Bas ic
            { cells: [[3,1],[3,2]], direction: 'up' },
            // Boyun
            { cells: [[2,3],[3,3],[4,3],[5,3]], direction: 'right' },
            // Govde ust yatay (uzun)
            { cells: [[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,4],[13,4]], direction: 'right' },
            // On pati sol dikey
            { cells: [[0,3],[0,4],[0,5],[0,6],[0,7]], direction: 'down' },
            // On pati ic
            { cells: [[1,4],[1,5],[2,5]], direction: 'left' },
            // Govde ic ust
            { cells: [[3,5],[4,5],[5,5]], direction: 'left' },
            // Govde ic orta L
            { cells: [[6,5],[6,6],[7,6],[8,6]], direction: 'right' },
            // Govde ic alt L
            { cells: [[9,5],[9,6],[10,6]], direction: 'right' },
            // Sirt cizgisi
            { cells: [[13,5],[13,6],[13,7]], direction: 'down' },
            // Karin alt
            { cells: [[3,6],[4,6],[5,6],[5,7]], direction: 'down' },
            // Arka bacak
            { cells: [[10,7],[11,7],[12,7],[12,8]], direction: 'down' },
            // Kuyruk
            { cells: [[11,5],[12,5]], direction: 'right' },
            // Taban uzun yatay
            { cells: [[0,8],[1,8],[2,8],[3,8],[4,8],[5,8]], direction: 'left' },
            // Taban sag
            { cells: [[7,8],[8,8],[9,8],[10,8]], direction: 'right' },
            // Alt detay
            { cells: [[6,7],[7,7],[8,7]], direction: 'right' },
            // Alt detay 2
            { cells: [[1,7],[2,7],[3,7]], direction: 'left' },
            // Son taban
            { cells: [[13,8],[13,9]], direction: 'down' },
            { cells: [[0,9],[1,9],[2,9]], direction: 'left' }
        ]
    },
    {
        // Seviye 5 - Cift Piramit + Gunes Diski (en buyuk)
        id: 'egypt_5',
        chapter: 1,
        level: 5,
        name: 'Seviye 5',
        gridWidth: 14,
        gridHeight: 12,
        paths: [
            // Gunes diski ust
            { cells: [[5,0],[6,0],[7,0],[8,0]], direction: 'up' },
            // Gunes sol
            { cells: [[4,1],[4,2]], direction: 'left' },
            // Gunes sag
            { cells: [[9,1],[9,2]], direction: 'right' },
            // Gunes alt
            { cells: [[5,2],[6,2],[7,2],[8,2]], direction: 'left' },
            // Gunes isinlari sol
            { cells: [[2,1],[3,1]], direction: 'left' },
            // Gunes isinlari sag
            { cells: [[10,1],[11,1]], direction: 'right' },
            // Piramit sol yan uzun
            { cells: [[0,3],[1,3],[1,4],[1,5],[1,6],[0,6]], direction: 'down' },
            // Piramit sag yan uzun
            { cells: [[13,3],[12,3],[12,4],[12,5],[12,6],[13,6]], direction: 'down' },
            // Piramit ic sol ust L
            { cells: [[3,3],[4,3],[5,3],[5,4]], direction: 'down' },
            // Piramit ic sag ust L
            { cells: [[8,4],[8,3],[9,3],[10,3]], direction: 'right' },
            // Piramit orta yatay
            { cells: [[2,4],[3,4],[4,4]], direction: 'left' },
            // Piramit orta yatay sag
            { cells: [[9,4],[10,4],[11,4]], direction: 'right' },
            // Piramit ic sol alt
            { cells: [[3,5],[4,5],[4,6]], direction: 'down' },
            // Piramit ic sag alt
            { cells: [[9,5],[9,6]], direction: 'down' },
            // Piramit ic orta dikey
            { cells: [[6,3],[6,4],[6,5],[7,5],[7,4],[7,3]], direction: 'up' },
            // Orta cerceve
            { cells: [[2,5],[3,6]], direction: 'down' },
            // Alt piramit ust yatay
            { cells: [[2,7],[3,7],[4,7],[5,7],[6,7],[7,7],[8,7],[9,7],[10,7],[11,7]], direction: 'right' },
            // Alt piramit sol
            { cells: [[0,8],[1,8],[2,8],[3,8]], direction: 'left' },
            // Alt piramit sag
            { cells: [[10,8],[11,8],[12,8],[13,8]], direction: 'right' },
            // Alt piramit ic sol
            { cells: [[4,8],[5,8],[5,9]], direction: 'down' },
            // Alt piramit ic sag
            { cells: [[8,8],[8,9]], direction: 'down' },
            // Alt piramit orta
            { cells: [[6,8],[6,9],[7,9],[7,8]], direction: 'up' },
            // Taban
            { cells: [[0,10],[1,10],[2,10],[3,10],[4,10]], direction: 'left' },
            { cells: [[9,10],[10,10],[11,10],[12,10],[13,10]], direction: 'right' },
            { cells: [[5,10],[6,10],[7,10],[8,10]], direction: 'down' },
            // Son satir
            { cells: [[3,11],[4,11],[5,11]], direction: 'down' },
            { cells: [[8,11],[9,11],[10,11]], direction: 'down' }
        ]
    }
];
