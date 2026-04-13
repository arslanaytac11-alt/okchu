// js/data/levels/greek.js
// Yunan - Seviye 6-10 - Tapınak, Sutun, Vazo, Trident, Omega

export const greekLevels = [
    {
        // Seviye 6 - Yunan Tapinagi
        id: 'greek_1',
        chapter: 2,
        level: 6,
        name: 'Seviye 6',
        gridWidth: 12,
        gridHeight: 10,
        paths: [
            // Ucgen cati
            { cells: [[5,0],[6,0]], direction: 'up' },
            { cells: [[4,1],[5,1]], direction: 'left' },
            { cells: [[6,1],[7,1]], direction: 'right' },
            { cells: [[3,2],[4,2]], direction: 'left' },
            { cells: [[7,2],[8,2]], direction: 'right' },
            // Friz (uzun yatay)
            { cells: [[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]], direction: 'right' },
            // 4 sutun (dikey)
            { cells: [[2,4],[2,5],[2,6],[2,7]], direction: 'down' },
            { cells: [[5,4],[5,5],[5,6],[5,7]], direction: 'down' },
            { cells: [[7,4],[7,5],[7,6],[7,7]], direction: 'down' },
            { cells: [[10,4],[10,5],[10,6],[10,7]], direction: 'down' },
            // Sutun detaylari (kucuk yatay)
            { cells: [[3,4],[4,4]], direction: 'right' },
            { cells: [[8,4],[9,4]], direction: 'right' },
            { cells: [[3,6],[4,6]], direction: 'left' },
            { cells: [[8,6],[9,6]], direction: 'left' },
            // Taban 1
            { cells: [[1,8],[2,8],[3,8],[4,8],[5,8]], direction: 'left' },
            // Taban 2
            { cells: [[7,8],[8,8],[9,8],[10,8]], direction: 'right' },
            // Basamak
            { cells: [[0,9],[1,9],[2,9],[3,9],[4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9]], direction: 'right' }
        ]
    },
    {
        // Seviye 7 - Dev Amphora Vazo
        id: 'greek_2',
        chapter: 2,
        level: 7,
        name: 'Seviye 7',
        gridWidth: 12,
        gridHeight: 12,
        paths: [
            // Vazo agzi sol
            { cells: [[3,0],[4,0],[4,1]], direction: 'up' },
            // Vazo agzi sag
            { cells: [[7,0],[7,1],[8,0]], direction: 'up' },
            // Boyun sol
            { cells: [[5,1],[5,2]], direction: 'left' },
            // Boyun sag
            { cells: [[6,1],[6,2]], direction: 'right' },
            // Sol kulp L
            { cells: [[0,3],[1,3],[1,4],[0,4],[0,5]], direction: 'down' },
            // Sag kulp L
            { cells: [[11,3],[10,3],[10,4],[11,4],[11,5]], direction: 'down' },
            // Omuz sol
            { cells: [[2,3],[3,3],[4,3]], direction: 'left' },
            // Omuz sag
            { cells: [[7,3],[8,3],[9,3]], direction: 'right' },
            // Govde sol dikey
            { cells: [[2,4],[2,5],[2,6],[2,7]], direction: 'down' },
            // Govde sag dikey
            { cells: [[9,4],[9,5],[9,6],[9,7]], direction: 'down' },
            // Govde ic sol L
            { cells: [[4,4],[4,5],[3,5]], direction: 'left' },
            // Govde ic sag L
            { cells: [[7,4],[7,5],[8,5]], direction: 'right' },
            // Govde ic orta
            { cells: [[5,4],[6,4],[6,5],[5,5]], direction: 'left' },
            // Daralma sol
            { cells: [[3,7],[3,8],[4,8]], direction: 'down' },
            // Daralma sag
            { cells: [[8,7],[8,8],[7,8]], direction: 'down' },
            // Govde orta alt
            { cells: [[5,6],[5,7],[6,7],[6,6]], direction: 'up' },
            // Taban genis
            { cells: [[4,9],[5,9],[6,9],[7,9]], direction: 'down' },
            // Ayak sol
            { cells: [[3,10],[4,10],[5,10]], direction: 'down' },
            // Ayak sag
            { cells: [[6,10],[7,10],[8,10]], direction: 'down' },
            // Taban cizgisi
            { cells: [[2,11],[3,11],[4,11],[5,11],[6,11],[7,11],[8,11],[9,11]], direction: 'right' }
        ]
    },
    {
        // Seviye 8 - Trident (Poseidon mizragi)
        id: 'greek_3',
        chapter: 2,
        level: 8,
        name: 'Seviye 8',
        gridWidth: 12,
        gridHeight: 14,
        paths: [
            // Sol dis dikey
            { cells: [[0,0],[0,1],[0,2],[0,3]], direction: 'up' },
            // Orta uc dikey
            { cells: [[5,0],[5,1],[5,2],[5,3]], direction: 'up' },
            // Sag uc dikey
            { cells: [[11,0],[11,1],[11,2],[11,3]], direction: 'up' },
            // Sol uc yay
            { cells: [[1,1],[1,2]], direction: 'left' },
            // Sag uc yay
            { cells: [[10,1],[10,2]], direction: 'right' },
            // Orta uc L sol
            { cells: [[4,2],[4,3]], direction: 'left' },
            // Orta uc L sag
            { cells: [[6,2],[6,3]], direction: 'right' },
            // Birlesme sol uzun
            { cells: [[1,4],[2,4],[3,4],[4,4]], direction: 'left' },
            // Birlesme sag uzun
            { cells: [[7,4],[8,4],[9,4],[10,4]], direction: 'right' },
            // Sap ust orta
            { cells: [[5,4],[5,5],[5,6]], direction: 'down' },
            // Sap susu sol
            { cells: [[3,5],[4,5]], direction: 'left' },
            // Sap susu sag
            { cells: [[6,5],[7,5]], direction: 'right' },
            // Sap orta sol
            { cells: [[4,6],[4,7]], direction: 'down' },
            // Sap orta sag
            { cells: [[6,6],[6,7]], direction: 'down' },
            // Sap alt
            { cells: [[5,7],[5,8],[5,9],[5,10]], direction: 'down' },
            // Alt susleme sol
            { cells: [[3,8],[4,8]], direction: 'left' },
            // Alt susleme sag
            { cells: [[6,8],[7,8]], direction: 'right' },
            // Pommel
            { cells: [[3,11],[4,11],[5,11],[6,11],[7,11]], direction: 'down' },
            // Pommel alt sol
            { cells: [[4,12],[4,13]], direction: 'down' },
            // Pommel alt sag
            { cells: [[6,12],[6,13]], direction: 'down' },
            // Pommel alt orta
            { cells: [[5,12],[5,13]], direction: 'down' }
        ]
    },
    {
        // Seviye 9 - Omega sembolü (yogun)
        id: 'greek_4',
        chapter: 2,
        level: 9,
        name: 'Seviye 9',
        gridWidth: 14,
        gridHeight: 12,
        paths: [
            // Ust yay uzun
            { cells: [[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0]], direction: 'up' },
            // Yay sol kolu
            { cells: [[2,1],[2,2],[2,3]], direction: 'left' },
            // Yay sag kolu
            { cells: [[11,1],[11,2],[11,3]], direction: 'right' },
            // Sol dis L
            { cells: [[1,2],[1,3],[1,4],[0,4]], direction: 'left' },
            // Sag dis L
            { cells: [[12,2],[12,3],[12,4],[13,4]], direction: 'right' },
            // Ic halka sol
            { cells: [[3,1],[3,2],[3,3]], direction: 'down' },
            // Ic halka sag
            { cells: [[10,1],[10,2],[10,3]], direction: 'down' },
            // Sol dikey uzun
            { cells: [[0,5],[0,6],[0,7]], direction: 'down' },
            // Sag dikey uzun
            { cells: [[13,5],[13,6],[13,7]], direction: 'down' },
            // Ic sol L
            { cells: [[4,4],[4,5],[3,5]], direction: 'left' },
            // Ic sag L
            { cells: [[9,4],[9,5],[10,5]], direction: 'right' },
            // Orta ic sol
            { cells: [[5,4],[5,5],[5,6]], direction: 'down' },
            // Orta ic sag
            { cells: [[8,4],[8,5],[8,6]], direction: 'down' },
            // Orta yatay
            { cells: [[6,5],[7,5]], direction: 'right' },
            // Alt sol L
            { cells: [[1,6],[2,6],[2,7],[1,7]], direction: 'down' },
            // Alt sag L
            { cells: [[12,6],[11,6],[11,7],[12,7]], direction: 'down' },
            // Alt orta sol
            { cells: [[4,7],[3,7],[3,8]], direction: 'down' },
            // Alt orta sag
            { cells: [[9,7],[10,7],[10,8]], direction: 'down' },
            // Ayak sol uzun
            { cells: [[0,8],[1,8],[2,8]], direction: 'left' },
            // Ayak sag uzun
            { cells: [[11,8],[12,8],[13,8]], direction: 'right' },
            // Ayak sol alt
            { cells: [[0,9],[1,9],[2,9],[3,9]], direction: 'down' },
            // Ayak sag alt
            { cells: [[10,9],[11,9],[12,9],[13,9]], direction: 'down' },
            // Taban sol
            { cells: [[4,9],[5,9],[6,9]], direction: 'down' },
            // Taban sag
            { cells: [[7,9],[8,9],[9,9]], direction: 'down' },
            // Orta alt detay
            { cells: [[6,6],[6,7],[7,7],[7,6]], direction: 'up' }
        ]
    },
    {
        // Seviye 10 - Labirent Tapınak (en karmasik)
        id: 'greek_5',
        chapter: 2,
        level: 10,
        name: 'Seviye 10',
        gridWidth: 14,
        gridHeight: 14,
        paths: [
            // Dis cerceve ust
            { cells: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0]], direction: 'up' },
            // Dis sol dikey
            { cells: [[0,1],[0,2],[0,3],[0,4],[0,5]], direction: 'left' },
            // Dis sag dikey
            { cells: [[13,1],[13,2],[13,3],[13,4],[13,5]], direction: 'right' },
            // 2. katman ust
            { cells: [[2,2],[3,2],[4,2],[5,2]], direction: 'left' },
            { cells: [[8,2],[9,2],[10,2],[11,2]], direction: 'right' },
            // 2. katman sol
            { cells: [[2,3],[2,4],[2,5]], direction: 'down' },
            // 2. katman sag
            { cells: [[11,3],[11,4],[11,5]], direction: 'down' },
            // 3. katman ust
            { cells: [[4,4],[5,4],[6,4]], direction: 'left' },
            { cells: [[7,4],[8,4],[9,4]], direction: 'right' },
            // 3. katman sol
            { cells: [[4,5],[4,6]], direction: 'down' },
            // 3. katman sag
            { cells: [[9,5],[9,6]], direction: 'down' },
            // Merkez
            { cells: [[6,5],[6,6],[7,6],[7,5]], direction: 'up' },
            // Ic sol L
            { cells: [[1,1],[1,2]], direction: 'left' },
            { cells: [[12,1],[12,2]], direction: 'right' },
            // 3. katman alt
            { cells: [[4,7],[5,7],[6,7]], direction: 'left' },
            { cells: [[7,7],[8,7],[9,7]], direction: 'right' },
            // 2. katman alt
            { cells: [[2,7],[2,8],[2,9]], direction: 'down' },
            { cells: [[11,7],[11,8],[11,9]], direction: 'down' },
            // Alt yataylar
            { cells: [[3,9],[4,9],[5,9]], direction: 'left' },
            { cells: [[8,9],[9,9],[10,9]], direction: 'right' },
            // Dis sol alt
            { cells: [[0,6],[0,7],[0,8],[0,9],[0,10]], direction: 'down' },
            // Dis sag alt
            { cells: [[13,6],[13,7],[13,8],[13,9],[13,10]], direction: 'down' },
            // Alt dis yatay
            { cells: [[1,10],[2,10],[3,10],[4,10],[5,10],[6,10]], direction: 'left' },
            { cells: [[7,10],[8,10],[9,10],[10,10],[11,10],[12,10]], direction: 'right' },
            // Son katman
            { cells: [[0,11],[1,11],[2,11],[3,11]], direction: 'down' },
            { cells: [[10,11],[11,11],[12,11],[13,11]], direction: 'down' },
            { cells: [[5,11],[6,11],[7,11],[8,11]], direction: 'down' },
            // Baglanti L'ler
            { cells: [[5,8],[5,6]], direction: 'up' },
            { cells: [[8,8],[8,6]], direction: 'up' },
            // Ic detaylar
            { cells: [[3,3],[3,4]], direction: 'left' },
            { cells: [[10,3],[10,4]], direction: 'right' },
            { cells: [[6,2],[7,2]], direction: 'up' },
            { cells: [[6,9],[7,9]], direction: 'down' }
        ]
    }
];
