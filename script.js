document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('gameGrid');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const statsDisplay = document.getElementById('statsDisplay');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageNumbersContainer = document.getElementById('pageNumbers');
    const paginationContainer = document.getElementById('pagination');
    const pageInput = document.getElementById('pageInput');
    const jumpBtn = document.getElementById('jumpBtn');

    let allGameData = null;
    let currentGames = [];
    let currentCategory = 'all';
    let currentPage = 1;
    const itemsPerPage = 100;

    const updateLastUpdated = (timestamp) => {
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl && timestamp) {
            lastUpdatedEl.textContent = `データ最終更新: ${timestamp}`;
        }
    };

    const loadData = async () => {
        try {
            // キャッシュを回避するためにタイムスタンプを付与してfetch
            const response = await fetch(`games.json?t=${new Date().getTime()}`);
            const data = await response.json();
            
            // games.json の新フォーマット（metadataあり）か旧フォーマットかをチェック
            if (data.games) {
                allGameData = data.games;
                updateLastUpdated(data.last_updated);
            } else {
                allGameData = data;
            }

            // 名作のみ（評価 6.0 以上、評価数 10 以上）をフィルタリング
            // (update_data.py で games.js 向けに行っているのと同様の処理)
            const topGames = allGameData.filter(g => g.num_ratings >= 10 && g.rating >= 6.0);
            
            currentGames = [...topGames];
            applyFiltersAndSort();
        } catch (error) {
            console.error('データの読み込みに失敗しました:', error);
            if (window.location.protocol === 'file:') {
                grid.innerHTML = `
                    <div style="color: #ef4444; text-align: center; grid-column: 1 / -1; background: rgba(239, 68, 68, 0.1); padding: 20px; border-radius: 12px; border: 1px solid #ef4444;">
                        <p style="font-weight: bold; margin-bottom: 10px;">ブラウザのセキュリティ制限により、ファイルを直接開くとデータを読み込めません。</p>
                        <p style="font-size: 0.9rem;">フォルダ内の <strong>start_server.bat</strong> を実行して、表示された <strong>http://localhost:8000</strong> にアクセスしてください。</p>
                    </div>`;
            } else {
                grid.innerHTML = '<p style="color: #ef4444; text-align: center; grid-column: 1 / -1;">データの読み込みに失敗しました。update_data.py を実行して games.json が生成されているか確認してください。</p>';
            }
        }
    };

    const renderGrid = (allGamesToRender) => {
        grid.innerHTML = '';
        if (allGamesToRender.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: 1 / -1;">該当するゲームが見つかりませんでした。</p>';
            paginationContainer.style.display = 'none';
            statsDisplay.textContent = '表示件数: 0件';
            return;
        }

        const totalPages = Math.ceil(allGamesToRender.length / itemsPerPage);
        if (currentPage > totalPages) currentPage = totalPages || 1;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, allGamesToRender.length);
        const gamesToRender = allGamesToRender.slice(startIndex, endIndex);

        paginationContainer.style.display = allGamesToRender.length > itemsPerPage ? 'flex' : 'none';
        
        // Render Page Numbers
        pageNumbersContainer.innerHTML = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-num ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => {
                currentPage = i;
                renderGrid(allGamesToRender);
                window.scrollTo({ top: 0 });
            };
            pageNumbersContainer.appendChild(pageBtn);
        }

        pageInput.value = currentPage;
        pageInput.max = totalPages;

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;

        const fragment = document.createDocumentFragment();

        gamesToRender.forEach((game, index) => {
            const card = document.createElement('a');
            card.className = 'card';
            card.href = `https://delicious-fruit.com/ratings/game_details.php?id=${game.id}`;
            card.target = '_blank';

            const gameTitle = document.createElement('h3');
            gameTitle.className = 'game-title';
            gameTitle.textContent = game.name;

            const diffBadge = document.createElement('span');
            diffBadge.className = 'badge difficulty-badge';
            diffBadge.textContent = `Average Difficulty: ${game.difficulty}`;

            // Set background color based on average difficulty
            if (game.difficulty !== 'N/A') {
                if (game.difficulty_num <= 30) {
                    diffBadge.style.backgroundColor = '#8380FB';
                } else if (game.difficulty_num <= 70) {
                    diffBadge.style.backgroundColor = '#CC80B2';
                } else {
                    diffBadge.style.backgroundColor = '#ef4444'; // 70.1+ (Red)
                }
                diffBadge.style.color = '#ffffff';
            }

            const headerDiv = document.createElement('div');
            headerDiv.className = 'card-header';
            headerDiv.appendChild(gameTitle);

            const metricsDiv = document.createElement('div');
            metricsDiv.className = 'card-metrics';

            const ratingMetric = document.createElement('div');
            ratingMetric.className = 'metric';
            const ratingVal = document.createElement('span');
            ratingVal.className = 'metric-value';
            ratingVal.textContent = game.rating.toFixed(1);
            const ratingLabel = document.createElement('span');
            ratingLabel.className = 'metric-label';
            ratingLabel.textContent = 'RATING';
            ratingMetric.appendChild(ratingVal);
            ratingMetric.appendChild(ratingLabel);

            const commentMetric = document.createElement('div');
            commentMetric.className = 'metric';
            const commentVal = document.createElement('span');
            commentVal.className = 'metric-value';
            commentVal.textContent = game.num_ratings;
            commentVal.style.color = '#fff';
            const commentLabel = document.createElement('span');
            commentLabel.className = 'metric-label';
            commentLabel.textContent = 'COMMENTS';
            commentMetric.appendChild(commentVal);
            commentMetric.appendChild(commentLabel);

            metricsDiv.appendChild(ratingMetric);
            metricsDiv.appendChild(commentMetric);

            card.appendChild(headerDiv);
            card.appendChild(diffBadge);
            card.appendChild(metricsDiv);

            fragment.appendChild(card);
        });

        grid.appendChild(fragment);
        statsDisplay.textContent = `表示中: ${startIndex + 1}-${endIndex} / 全${allGamesToRender.length}件`;
    };

    const applyFiltersAndSort = () => {
        if (!allGameData) return; // データ未ロード時は何もしない
        
        const query = searchInput.value.toLowerCase();
        const sortValue = sortSelect.value;

        // Filter from allGameData (filtered for masterpieces)
        const baseGames = allGameData.filter(g => g.num_ratings >= 10 && g.rating >= 6.0);
        
        currentGames = baseGames.filter(game => {
            const matchesQuery = game.name.toLowerCase().includes(query);
            let matchesCategory = true;
            
            if (currentCategory === 'needle') {
                matchesCategory = game.is_needle;
            } else if (currentCategory === 'avoidance') {
                matchesCategory = game.is_avoidance;
            } else if (currentCategory === 'other') {
                matchesCategory = !game.is_needle && !game.is_avoidance;
            }

            return matchesQuery && matchesCategory;
        });

        // Sort
        if (sortValue === 'ratings_desc') {
            currentGames.sort((a, b) => b.num_ratings - a.num_ratings || b.rating - a.rating);
        } else if (sortValue === 'rating_desc') {
            currentGames.sort((a, b) => b.rating - a.rating || b.num_ratings - a.num_ratings);
        } else if (sortValue === 'newest') {
            currentGames.sort((a, b) => b.id - a.id);
        } else if (sortValue === 'difficulty_desc') {
            currentGames.sort((a, b) => b.difficulty_num - a.difficulty_num || b.rating - a.rating);
        } else if (sortValue === 'difficulty_asc') {
            currentGames.sort((a, b) => {
                let da = a.difficulty_num === 0 ? 999 : a.difficulty_num;
                let db = b.difficulty_num === 0 ? 999 : b.difficulty_num;
                return da - db || b.rating - a.rating;
            });
        }

        currentPage = 1;
        renderGrid(currentGames);
    };

    // Event Listeners
    searchInput.addEventListener('input', applyFiltersAndSort);
    sortSelect.addEventListener('change', applyFiltersAndSort);

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            applyFiltersAndSort();
        });
    });

    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderGrid(currentGames);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(currentGames.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderGrid(currentGames);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    const handleJump = () => {
        const totalPages = Math.ceil(currentGames.length / itemsPerPage);
        let targetPage = parseInt(pageInput.value);
        if (isNaN(targetPage)) return;
        
        targetPage = Math.max(1, Math.min(totalPages, targetPage));
        currentPage = targetPage;
        renderGrid(currentGames);
        window.scrollTo({ top: 0 });
    };

    jumpBtn.addEventListener('click', handleJump);
    pageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleJump();
    });

    // Add keyframes dynamically
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    // Initial Load
    loadData();

    // Back to Top functionality
    const backToTopBtn = document.getElementById('backToTopBtn');

    window.addEventListener('scroll', () => {
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            backToTopBtn.style.display = 'block';
        } else {
            backToTopBtn.style.display = 'none';
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});
