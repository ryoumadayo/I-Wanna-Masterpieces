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

    // My Lists management
    const STORAGE_KEY = 'delicious_mylists_v2';
    const OLD_STORAGE_KEY = 'delicious_bookmarks';
    
    // Initial loading
    let myListsData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"lists": {"default": {"name": "メインリスト", "gameIds": []}}, "activeId": "default"}');

    // Migration from old bookmarks if exists
    if (!localStorage.getItem(STORAGE_KEY) && localStorage.getItem(OLD_STORAGE_KEY)) {
        const oldData = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY));
        myListsData.lists.default.gameIds = Object.keys(oldData).map(id => parseInt(id));
        // Remove old storage to avoid infinite migration
        // localStorage.removeItem(OLD_STORAGE_KEY); 
    }

    const saveMyLists = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(myListsData));
    };

    const toggleInMyList = (e, gameId, gameName) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const container = document.createElement('div');
        container.innerHTML = `
            <p style="margin-bottom: 1rem; color: var(--text-secondary);">「${gameName}」を保存するリストを選択してください：</p>
            <div id="listSelectionContainer">
                ${Object.keys(myListsData.lists).map(id => {
                    const list = myListsData.lists[id];
                    const isInList = list.gameIds.includes(gameId);
                    return `
                        <label class="list-selection-item">
                            <input type="checkbox" id="check_${id}" ${isInList ? 'checked' : ''} onchange="updateGameInList('${id}', ${gameId}, this.checked)">
                            <span>${list.name}</span>
                        </label>
                    `;
                }).join('')}
            </div>
            <div class="modal-footer">
                <button class="control-btn mini" onclick="addNewList(() => toggleInMyList(null, ${gameId}, '${gameName}'))">＋ 新しいリスト</button>
                <button class="control-btn mini" onclick="hideModal()">完了</button>
            </div>
        `;
        showModal('マイリストに追加', container);
    };

    window.updateGameInList = (listId, gameId, isChecked) => {
        const list = myListsData.lists[listId];
        if (!list) return;

        const index = list.gameIds.indexOf(gameId);
        if (isChecked && index === -1) {
            list.gameIds.push(gameId);
        } else if (!isChecked && index !== -1) {
            list.gameIds.splice(index, 1);
        }
        
        saveMyLists();
        
        // Refresh UI
        if (currentCategory === 'mylists') {
            applyFiltersAndSort();
        } else {
            renderGrid(currentGames);
        }
    };

    const getActiveList = () => myListsData.lists[myListsData.activeId] || myListsData.lists['default'];

    // Modal Helpers
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const closeModalBtn = document.getElementById('closeModal');

    const showModal = (title, bodyContent) => {
        modalTitle.textContent = title;
        modalBody.innerHTML = '';
        if (typeof bodyContent === 'string') {
            modalBody.innerHTML = bodyContent;
        } else {
            modalBody.appendChild(bodyContent);
        }
        modalOverlay.style.display = 'flex';
    };

    const hideModal = () => {
        modalOverlay.style.display = 'none';
        modalBody.innerHTML = '';
    };

    closeModalBtn.onclick = hideModal;
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) hideModal();
    };

    const addNewList = (callback) => {
        const container = document.createElement('div');
        container.className = 'modal-input-container';
        container.innerHTML = `
            <label>新しいリストの名前:</label>
            <input type="text" id="newListInput" placeholder="例: お気に入り, 攻略中..." autofocus>
            <div class="modal-footer">
                <button class="control-btn mini" id="confirmAddBtn">作成する</button>
            </div>
        `;
        showModal('マイリストを作成', container);
        
        const input = document.getElementById('newListInput');
        const confirmBtn = document.getElementById('confirmAddBtn');
        
        const handleConfirm = () => {
            const name = input.value.trim();
            if (name) {
                const id = 'list_' + new Date().getTime();
                myListsData.lists[id] = { name: name, gameIds: [] };
                myListsData.activeId = id;
                saveMyLists();
                hideModal();
                applyFiltersAndSort();
                if (callback) callback(id);
            }
        };

        confirmBtn.onclick = handleConfirm;
        input.onkeypress = (e) => { if (e.key === 'Enter') handleConfirm(); };
    };

    const renameActiveList = () => {
        const list = getActiveList();
        const container = document.createElement('div');
        container.innerHTML = `
            <label>リストの新しい名前:</label>
            <input type="text" id="renameListInput" value="${list.name}" autofocus>
            <div class="modal-footer">
                <button class="control-btn mini" id="confirmRenameBtn">変更を保存</button>
            </div>
        `;
        showModal('名前を変更', container);
        
        const input = document.getElementById('renameListInput');
        const confirmBtn = document.getElementById('confirmRenameBtn');
        
        const handleConfirm = () => {
            const name = input.value.trim();
            if (name) {
                list.name = name;
                saveMyLists();
                hideModal();
                applyFiltersAndSort();
            }
        };

        confirmBtn.onclick = handleConfirm;
        input.onkeypress = (e) => { if (e.key === 'Enter') handleConfirm(); };
    };

    const deleteActiveList = () => {
        if (Object.keys(myListsData.lists).length <= 1) {
            alert('最後のリストは削除できません。');
            return;
        }
        
        const list = getActiveList();
        if (confirm(`リスト「${list.name}」を削除しますか？`)) {
            delete myListsData.lists[myListsData.activeId];
            myListsData.activeId = Object.keys(myListsData.lists)[0];
            saveMyLists();
            applyFiltersAndSort();
        }
    };

    const switchList = (id) => {
        if (myListsData.lists[id]) {
            myListsData.activeId = id;
            saveMyLists();
            applyFiltersAndSort();
        }
    };

    const updateMyListsUI = () => {
        let controls = document.getElementById('myListControls');
        if (!controls) {
            controls = document.createElement('div');
            controls.id = 'myListControls';
            controls.className = 'mylist-controls';
            paginationContainer.parentNode.insertBefore(controls, grid);
        }

        if (currentCategory === 'mylists') {
            controls.style.display = 'flex';
            
            // Build options
            let optionsHtml = Object.keys(myListsData.lists).map(id => 
                `<option value="${id}" ${id === myListsData.activeId ? 'selected' : ''}>${myListsData.lists[id].name}</option>`
            ).join('');

            controls.innerHTML = `
                <div class="list-selector">
                    <label>表示中のリスト:</label>
                    <select id="listSelect" onchange="switchList(this.value)">
                        ${optionsHtml}
                    </select>
                </div>
                <div class="list-actions">
                    <button class="control-btn mini" onclick="addNewList()" title="新しいリストを追加">＋ 新規</button>
                    <button class="control-btn mini" onclick="renameActiveList()" title="名前を変更">✎ 編集</button>
                    <button class="control-btn mini danger" onclick="deleteActiveList()" title="現在のリストを削除">× 削除</button>
                </div>
            `;
        } else {
            controls.style.display = 'none';
        }
    };

    window.hideModal = hideModal;
    window.toggleInMyList = toggleInMyList;
    window.switchList = switchList;
    window.addNewList = addNewList;
    window.renameActiveList = renameActiveList;
    window.deleteActiveList = deleteActiveList;

    const updateLastUpdated = (timestamp) => {
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl && timestamp) {
            lastUpdatedEl.textContent = `データ最終更新: ${timestamp}`;
        }
    };

    let showAllAnnouncements = false;
    let savedAnnouncements = [];

    const renderAnnouncements = (announcements) => {
        const section = document.getElementById('announcementSection');
        const list = document.getElementById('announcementList');
        if (!section || !list) return;

        if (!announcements || announcements.length === 0) {
            section.style.display = 'none';
            return;
        }

        savedAnnouncements = announcements;
        section.style.display = 'block';
        
        const displayed = showAllAnnouncements ? announcements : announcements.slice(0, 5);
        
        list.innerHTML = displayed.map(a => {
            let msgHtml = `<span class="announcement-msg">${a.message}</span>`;
            // Only add links for 'add' type (newly added games)
            if (a.id && a.type === 'add') {
                const gameName = a.message.split(/ が|。/)[0].replace(/'/g, "\\'");
                msgHtml = `<a href="javascript:void(0)" onclick="searchAndShowGame('${gameName}')" class="announcement-link">${a.message}</a>`;
            }
            return `
                <div class="announcement-item ${a.type || ''}">
                    <span class="announcement-date">${a.date}</span>
                    ${msgHtml}
                </div>
            `;
        }).join('');

        // Add 'See More' button if there are more than 5
        if (announcements.length > 5) {
            const moreBtnId = 'announcementMoreBtn';
            let moreBtn = document.getElementById(moreBtnId);
            if (!moreBtn) {
                moreBtn = document.createElement('button');
                moreBtn.id = moreBtnId;
                moreBtn.className = 'announcement-more-btn';
                section.appendChild(moreBtn);
            }
            moreBtn.textContent = showAllAnnouncements ? '閉じる' : `他 ${announcements.length - 5} 件を表示...`;
            moreBtn.onclick = () => {
                showAllAnnouncements = !showAllAnnouncements;
                renderAnnouncements(savedAnnouncements);
            };
        }
    };

    window.searchAndShowGame = (gameName) => {
        // Reset category to 'all' if not already, to ensure the game is shown
        if (currentCategory !== 'all' && currentCategory !== 'mylists') {
             const allBtn = Array.from(filterButtons).find(b => b.dataset.category === 'all');
             if (allBtn) {
                 filterButtons.forEach(b => b.classList.remove('active'));
                 allBtn.classList.add('active');
                 currentCategory = 'all';
             }
        }
        
        searchInput.value = gameName;
        applyFiltersAndSort();
        window.scrollTo({ top: searchInput.offsetTop - 100, behavior: 'smooth' });
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
                renderAnnouncements(data.announcements);
            } else {
                allGameData = data;
                renderAnnouncements([]);
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

            const activeList = getActiveList();
            const isInList = activeList.gameIds.includes(game.id);
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

            const bookmarkBtn = document.createElement('button');
            const isInAnyList = Object.values(myListsData.lists).some(list => list.gameIds.includes(game.id));
            bookmarkBtn.className = `bookmark-btn ${isInAnyList ? 'active' : ''}`;
            bookmarkBtn.innerHTML = isInAnyList ? '★' : '☆';
            bookmarkBtn.title = 'マイリストに追加/削除';
            bookmarkBtn.onclick = (e) => toggleInMyList(e, game.id, game.name.replace(/'/g, "\\'"));

            const headerDiv = document.createElement('div');
            headerDiv.className = 'card-header';
            headerDiv.appendChild(gameTitle);
            
            const btnGroup = document.createElement('div');
            btnGroup.className = 'btn-group';
            btnGroup.appendChild(bookmarkBtn);

            headerDiv.appendChild(btnGroup);

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

        // Base filter (masterpieces or all if in mylists)
        let baseGames = allGameData;
        if (currentCategory !== 'mylists') {
            baseGames = allGameData.filter(g => g.num_ratings >= 10 && g.rating >= 6.0);
        }
        
        const activeList = getActiveList();

        currentGames = baseGames.filter(game => {
            const matchesQuery = game.name.toLowerCase().includes(query);
            let matchesCategory = true;
            
            if (currentCategory === 'needle') {
                matchesCategory = game.is_needle;
            } else if (currentCategory === 'avoidance') {
                matchesCategory = game.is_avoidance;
            } else if (currentCategory === 'other') {
                matchesCategory = !game.is_needle && !game.is_avoidance;
            } else if (currentCategory === 'mylists') {
                matchesCategory = activeList.gameIds.includes(game.id);
            }

            return matchesQuery && matchesCategory;
        });

        // Special handling for export/import UI if in bookmarks
        updateMyListsUI();

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
