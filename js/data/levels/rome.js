// js/data/levels/rome.js
// Roma - Seviye 11-15 - Gladius, Kalkan, Kolezyum, Kartal

export const romeLevels = [
    {
        // Seviye 11 - Roma Kilici (Gladius)
        id: 'rome_1',
        chapter: 3,
        level: 11,
        name: 'Seviye 11',
        gridWidth: 10,
        gridHeight: 16,
        paths: [
            // Kilic ucu
            { cells: [[4,0],[5,0]], direction: 'up' },
            { cells: [[3,1],[4,1],[5,1],[6,1]], direction: 'up' },
            // Agiz sol
            { cells: [[2,2],[3,2],[3,3]], direction: 'left' },
            // Agiz sag
            { cells: [[6,2],[7,2],[6,3]], direction: 'right' },
            // Govde sol kenar
            { cells: [[3,4],[3,5],[3,6],[3,7]], direction: 'down' },
            // Govde sag kenar
            { cells: [[6,4],[6,5],[6,6],[6,7]], direction: 'down' },
            // Govde ic sol
            { cells: [[4,3],[4,4],[4,5]], direction: 'left' },
            // Govde ic sag
            { cells: [[5,3],[5,4],[5,5]], direction: 'right' },
            // Govde orta yatay
            { cells: [[4,6],[5,6]], direction: 'left' },
            // Govde alt ic
            { cells: [[4,7],[5,7]], direction: 'right' },
            // Cross-guard (uzun yatay)
            { cells: [[0,8],[1,8],[2,8],[3,8],[4,8]], direction: 'left' },
            { cells: [[5,8],[6,8],[7,8],[8,8],[9,8]], direction: 'right' },
            // Guard detay
            { cells: [[0,9],[1,9]], direction: 'left' },
            { cells: [[8,9],[9,9]], direction: 'right' },
            // Kabza sol
            { cells: [[3,9],[3,10],[3,11]], direction: 'down' },
            // Kabza sag
            { cells: [[6,9],[6,10],[6,11]], direction: 'down' },
            // Kabza ic
            { cells: [[4,9],[4,10],[5,10],[5,9]], direction: 'up' },
            // Kabza alt
            { cells: [[4,11],[5,11]], direction: 'down' },
            // Pommel
            { cells: [[2,12],[3,12],[4,12],[5,12],[6,12],[7,12]], direction: 'down' },
            { cells: [[3,13],[4,13],[5,13],[6,13]], direction: 'down' },
            { cells: [[4,14],[5,14]], direction: 'down' }
        ]
    },
    {
        // Seviye 12 - Roma Kalkani (yuvarlak yogun)
        id: 'rome_2',
        chapter: 3,
        level: 12,
        name: 'Seviye 12',
        gridWidth: 14,
        gridHeight: 14,
        paths: [
            // Dis halka ust
            { cells: [[4,0],[5,0],[6,0],[7,0],[8,0],[9,0]], direction: 'up' },
            // Dis halka sol ust
            { cells: [[2,1],[3,1],[3,2]], direction: 'left' },
            // Dis halka sag ust
            { cells: [[10,1],[11,1],[10,2]], direction: 'right' },
            // Dis sol dikey
            { cells: [[1,2],[1,3],[1,4],[0,4]], direction: 'left' },
            // Dis sag dikey
            { cells: [[12,2],[12,3],[12,4],[13,4]], direction: 'right' },
            // Sol orta
            { cells: [[0,5],[0,6],[0,7],[0,8]], direction: 'left' },
            // Sag orta
            { cells: [[13,5],[13,6],[13,7],[13,8]], direction: 'right' },
            // Ic halka ust
            { cells: [[5,2],[6,2],[7,2],[8,2]], direction: 'up' },
            // Ic sol
            { cells: [[4,3],[3,3],[3,4],[3,5]], direction: 'left' },
            // Ic sag
            { cells: [[9,3],[10,3],[10,4],[10,5]], direction: 'right' },
            // Merkez
            { cells: [[6,5],[7,5],[7,6],[6,6]], direction: 'left' },
            // Merkez sol
            { cells: [[4,5],[5,5],[5,6],[4,6]], direction: 'left' },
            // Merkez sag
            { cells: [[8,5],[9,5],[9,6],[8,6]], direction: 'right' },
            // Ic alt sol
            { cells: [[3,7],[3,8],[4,8]], direction: 'down' },
            // Ic alt sag
            { cells: [[10,7],[10,8],[9,8]], direction: 'down' },
            // Ic halka alt
            { cells: [[5,8],[6,8],[7,8],[8,8]], direction: 'down' },
            // Dis alt sol
            { cells: [[1,8],[1,9],[1,10],[2,10]], direction: 'down' },
            // Dis alt sag
            { cells: [[12,8],[12,9],[12,10],[11,10]], direction: 'down' },
            // Dis halka alt
            { cells: [[4,10],[5,10],[6,10],[7,10],[8,10],[9,10]], direction: 'down' },
            // Sol alt kose
            { cells: [[0,9],[0,10]], direction: 'down' },
            // Sag alt kose
            { cells: [[13,9],[13,10]], direction: 'down' },
            // Alt dis
            { cells: [[3,11],[4,11],[5,11]], direction: 'down' },
            { cells: [[8,11],[9,11],[10,11]], direction: 'down' },
            // Taban
            { cells: [[5,12],[6,12],[7,12],[8,12]], direction: 'down' },
            // Detaylar
            { cells: [[4,4],[5,4]], direction: 'left' },
            { cells: [[8,4],[9,4]], direction: 'right' },
            { cells: [[5,7],[6,7],[7,7]], direction: 'left' },
            { cells: [[4,7]], direction: 'left' },
            { cells: [[9,7]], direction: 'right' }
        ]
    },
    {
        // Seviye 13 - Kolezyum (arena)
        id: 'rome_3',
        chapter: 3,
        level: 13,
        name: 'Seviye 13',
        gridWidth: 16,
        gridHeight: 12,
        paths: [
            // Dis ust kemerler
            { cells: [[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0]], direction: 'up' },
            // Sol ust kemer
            { cells: [[2,1],[3,1],[3,2]], direction: 'left' },
            // Sag ust kemer
            { cells: [[12,1],[13,1],[12,2]], direction: 'right' },
            // Dis sol duvar
            { cells: [[0,2],[1,2],[1,3],[0,3],[0,4],[0,5]], direction: 'left' },
            // Dis sag duvar
            { cells: [[15,2],[14,2],[14,3],[15,3],[15,4],[15,5]], direction: 'right' },
            // Ic kemerler ust
            { cells: [[4,2],[5,2],[6,2]], direction: 'left' },
            { cells: [[9,2],[10,2],[11,2]], direction: 'right' },
            // Ic kemerler orta ust
            { cells: [[3,3],[4,3],[4,4]], direction: 'left' },
            { cells: [[11,3],[12,3],[11,4]], direction: 'right' },
            // Arena ust duvar sol
            { cells: [[2,4],[3,4],[3,5]], direction: 'left' },
            // Arena ust duvar sag
            { cells: [[12,4],[13,4],[12,5]], direction: 'right' },
            // Arena ic yatay ust
            { cells: [[5,4],[6,4],[7,4],[8,4],[9,4],[10,4]], direction: 'right' },
            // Arena sol dikey
            { cells: [[4,5],[4,6],[4,7]], direction: 'down' },
            // Arena sag dikey
            { cells: [[11,5],[11,6],[11,7]], direction: 'down' },
            // Arena orta yatay
            { cells: [[5,5],[6,5],[7,5]], direction: 'left' },
            { cells: [[8,5],[9,5],[10,5]], direction: 'right' },
            // Arena ic L'ler
            { cells: [[5,6],[6,6],[6,7]], direction: 'down' },
            { cells: [[9,6],[10,6],[9,7]], direction: 'down' },
            // Arena alt
            { cells: [[7,6],[8,6]], direction: 'right' },
            { cells: [[7,7],[8,7]], direction: 'left' },
            // Alt kemerler
            { cells: [[3,7],[3,8],[2,8]], direction: 'down' },
            { cells: [[12,7],[12,8],[13,8]], direction: 'down' },
            // Dis sol alt
            { cells: [[0,6],[0,7],[0,8],[1,8]], direction: 'left' },
            // Dis sag alt
            { cells: [[15,6],[15,7],[15,8],[14,8]], direction: 'right' },
            // Alt duvar sol
            { cells: [[1,9],[2,9],[3,9],[4,9],[5,9]], direction: 'left' },
            // Alt duvar sag
            { cells: [[10,9],[11,9],[12,9],[13,9],[14,9]], direction: 'right' },
            // Taban
            { cells: [[6,9],[7,9],[8,9],[9,9]], direction: 'down' },
            // Son satir
            { cells: [[0,10],[1,10],[2,10],[3,10]], direction: 'down' },
            { cells: [[12,10],[13,10],[14,10],[15,10]], direction: 'down' },
            { cells: [[5,10],[6,10],[7,10],[8,10],[9,10],[10,10]], direction: 'down' },
            // Alt detay
            { cells: [[5,8],[6,8],[7,8],[8,8],[9,8],[10,8]], direction: 'right' }
        ]
    },
    {
        // Seviye 14 - Roma Kartali (karmasik)
        id: 'rome_4',
        chapter: 3,
        level: 14,
        name: 'Seviye 14',
        gridWidth: 16,
        gridHeight: 12,
        paths: [
            // Bas
            { cells: [[6,0],[7,0],[8,0],[9,0]], direction: 'up' },
            { cells: [[5,1],[6,1]], direction: 'left' },
            { cells: [[9,1],[10,1]], direction: 'right' },
            // Gaga
            { cells: [[4,2],[5,2],[5,3]], direction: 'left' },
            // Bas arka
            { cells: [[10,2],[10,3]], direction: 'right' },
            // Boyun
            { cells: [[6,2],[7,2],[8,2],[9,2]], direction: 'up' },
            { cells: [[7,3],[8,3]], direction: 'right' },
            // Sol kanat (uzun)
            { cells: [[0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4]], direction: 'left' },
            // Sag kanat (uzun)
            { cells: [[9,4],[10,4],[11,4],[12,4],[13,4],[14,4],[15,4]], direction: 'right' },
            // Sol kanat alt
            { cells: [[0,5],[1,5],[2,5]], direction: 'left' },
            { cells: [[3,5],[4,5]], direction: 'up' },
            // Sag kanat alt
            { cells: [[13,5],[14,5],[15,5]], direction: 'right' },
            { cells: [[11,5],[12,5]], direction: 'up' },
            // Sol kanat detay
            { cells: [[0,6],[1,6]], direction: 'left' },
            // Sag kanat detay
            { cells: [[14,6],[15,6]], direction: 'right' },
            // Govde orta
            { cells: [[7,4],[7,5],[7,6]], direction: 'down' },
            { cells: [[8,4],[8,5],[8,6]], direction: 'down' },
            // Govde yanlar
            { cells: [[5,5],[6,5],[6,6]], direction: 'down' },
            { cells: [[9,5],[10,5],[9,6]], direction: 'down' },
            // Kuyruk
            { cells: [[7,7],[8,7]], direction: 'down' },
            { cells: [[5,7],[6,7]], direction: 'left' },
            { cells: [[9,7],[10,7]], direction: 'right' },
            // Bacaklar
            { cells: [[6,8],[6,9],[5,9]], direction: 'down' },
            { cells: [[9,8],[9,9],[10,9]], direction: 'down' },
            // Penceler sol
            { cells: [[4,10],[5,10],[6,10]], direction: 'down' },
            { cells: [[3,9],[3,10],[2,10]], direction: 'down' },
            // Penceler sag
            { cells: [[9,10],[10,10],[11,10]], direction: 'down' },
            { cells: [[12,9],[12,10],[13,10]], direction: 'down' },
            // Govde alt ic
            { cells: [[7,8],[7,9],[8,9],[8,8]], direction: 'up' }
        ]
    },
    {
        // Seviye 15 - SPQR Labirent (en zor)
        id: 'rome_5',
        chapter: 3,
        level: 15,
        name: 'Seviye 15',
        gridWidth: 16,
        gridHeight: 14,
        paths: [
            // Dis cerceve ust
            { cells: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[14,0],[15,0]], direction: 'up' },
            // Dis sol
            { cells: [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6]], direction: 'left' },
            // Dis sag
            { cells: [[15,1],[15,2],[15,3],[15,4],[15,5],[15,6]], direction: 'right' },
            // 2. katman ust sol
            { cells: [[2,2],[3,2],[4,2],[5,2]], direction: 'left' },
            // 2. katman ust sag
            { cells: [[10,2],[11,2],[12,2],[13,2]], direction: 'right' },
            // 2. katman sol dikey
            { cells: [[2,3],[2,4],[2,5]], direction: 'down' },
            // 2. katman sag dikey
            { cells: [[13,3],[13,4],[13,5]], direction: 'down' },
            // 3. katman yatay sol
            { cells: [[4,4],[5,4],[6,4]], direction: 'left' },
            // 3. katman yatay sag
            { cells: [[9,4],[10,4],[11,4]], direction: 'right' },
            // Merkez yatay
            { cells: [[6,5],[7,5],[8,5],[9,5]], direction: 'right' },
            // Merkez L sol
            { cells: [[4,5],[5,5],[5,6]], direction: 'down' },
            // Merkez L sag
            { cells: [[10,5],[11,5],[10,6]], direction: 'down' },
            // Ic baglanti sol
            { cells: [[1,1],[1,2]], direction: 'left' },
            // Ic baglanti sag
            { cells: [[14,1],[14,2]], direction: 'right' },
            // Ic detay
            { cells: [[3,3],[4,3]], direction: 'left' },
            { cells: [[11,3],[12,3]], direction: 'right' },
            // Orta dikey sol
            { cells: [[6,2],[6,3],[7,3],[7,2]], direction: 'up' },
            // Orta dikey sag
            { cells: [[8,2],[8,3]], direction: 'up' },
            // Alt yarim
            // Dis sol alt
            { cells: [[0,7],[0,8],[0,9],[0,10],[0,11]], direction: 'down' },
            // Dis sag alt
            { cells: [[15,7],[15,8],[15,9],[15,10],[15,11]], direction: 'down' },
            // Orta yansima
            { cells: [[2,6],[3,6],[4,6]], direction: 'left' },
            { cells: [[11,6],[12,6],[13,6]], direction: 'right' },
            // Alt 2. katman sol
            { cells: [[2,7],[2,8],[3,8]], direction: 'down' },
            { cells: [[13,7],[13,8],[12,8]], direction: 'down' },
            // Alt 3. katman
            { cells: [[4,7],[5,7],[6,7]], direction: 'left' },
            { cells: [[9,7],[10,7],[11,7]], direction: 'right' },
            // Alt merkez
            { cells: [[6,8],[7,8],[8,8]], direction: 'down' },
            { cells: [[7,6],[8,6]], direction: 'right' },
            // Alt ic
            { cells: [[4,8],[5,8],[5,9]], direction: 'down' },
            { cells: [[10,8],[9,8],[9,9]], direction: 'down' },
            // Alt yataylar
            { cells: [[1,9],[2,9],[3,9],[4,9]], direction: 'left' },
            { cells: [[11,9],[12,9],[13,9],[14,9]], direction: 'right' },
            // Son alt
            { cells: [[6,9],[7,9],[8,9]], direction: 'down' },
            // Taban
            { cells: [[0,12],[1,12],[2,12],[3,12],[4,12],[5,12]], direction: 'down' },
            { cells: [[10,12],[11,12],[12,12],[13,12],[14,12],[15,12]], direction: 'down' },
            { cells: [[6,10],[7,10],[8,10],[9,10]], direction: 'down' },
            { cells: [[1,10],[2,10],[3,10]], direction: 'down' },
            { cells: [[12,10],[13,10],[14,10]], direction: 'down' },
            // Ic detaylar
            { cells: [[5,10],[5,11]], direction: 'down' },
            { cells: [[10,10],[10,11]], direction: 'down' },
            { cells: [[6,11],[7,11],[8,11],[9,11]], direction: 'down' }
        ]
    }
];
