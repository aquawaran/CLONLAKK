// Frontend скрипт для Clone с Supabase
// Заменяет все API запросы на Supabase

// Глобальное состояние приложения
const app = {
    currentUser: null,
    userProfile: null,
    posts: [],
    currentScreen: 'auth',
    theme: 'light',
    subscriptions: []
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Проверяем текущего пользователя
        const { user, profile } = await window.db.getCurrentUser();
        if (user && profile) {
            app.currentUser = user;
            app.userProfile = profile;
            showScreen('feed');
            loadPosts();
        } else {
            showScreen('auth');
        }
        
        // Загружаем тему
        loadTheme();
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showNotification('Ошибка загрузки приложения', 'error');
    }
});

// Управление экранами
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const targetScreen = document.getElementById(screenName + 'Screen');
    if (targetScreen) {
        targetScreen.classList.add('active');
        app.currentScreen = screenName;
    }
}

// Аутентификация
async function handleRegister(event) {
    event.preventDefault();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const name = document.getElementById('registerName').value;
    const username = document.getElementById('registerUsername').value;
    
    try {
        showNotification('Регистрация...', 'info');
        
        const user = await window.db.register(email, password, username, name);
        
        showNotification('Успешная регистрация! Проверьте email.', 'success');
        
        // Переключаемся на форму входа
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        showNotification('Вход...', 'info');
        
        const { user, profile } = await window.db.login(email, password);
        
        app.currentUser = user;
        app.userProfile = profile;
        
        showNotification('Успешный вход!', 'success');
        showScreen('feed');
        loadPosts();
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleLogout() {
    try {
        await window.db.logout();
        
        app.currentUser = null;
        app.userProfile = null;
        
        showNotification('Вы вышли из аккаунта', 'info');
        showScreen('auth');
        
        // Отписываемся от всех real-time подписок
        app.subscriptions.forEach(sub => sub.unsubscribe());
        app.subscriptions = [];
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Посты
async function loadPosts() {
    try {
        showNotification('Загрузка постов...', 'info');
        
        const posts = await window.db.getPosts();
        app.posts = posts;
        
        displayPosts(posts);
        
        // Подписываемся на обновления постов
        subscribeToPostsUpdates();
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function createPost(event) {
    event.preventDefault();
    
    const content = document.getElementById('postContent').value;
    const mediaFiles = document.getElementById('postMedia').files;
    
    if (!content.trim()) {
        showNotification('Напишите что-нибудь...', 'error');
        return;
    }
    
    try {
        showNotification('Публикация...', 'info');
        
        // Загружаем медиа файлы если есть
        const mediaUrls = [];
        for (let file of mediaFiles) {
            const url = await window.db.uploadPostMedia(file, app.currentUser.id);
            mediaUrls.push(url);
        }
        
        // Создаем пост
        const post = await window.db.createPost(
            app.currentUser.id,
            content,
            mediaUrls
        );
        
        // Добавляем пост в начало ленты
        app.posts.unshift(post);
        displayPosts(app.posts);
        
        // Очищаем форму
        document.getElementById('postContent').value = '';
        document.getElementById('postMedia').value = '';
        
        showNotification('Опубликовано!', 'success');
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function displayPosts(posts) {
    const feedContainer = document.getElementById('feedContainer');
    if (!feedContainer) return;
    
    feedContainer.innerHTML = '';
    
    posts.forEach(post => {
        const postElement = createPostElement(post);
        feedContainer.appendChild(postElement);
    });
}

function createPostElement(post) {
    const div = document.createElement('div');
    div.className = 'post';
    div.innerHTML = `
        <div class="post-header">
            <img src="${post.author.avatar_url || 'default-avatar.png'}" alt="${post.author.name}" class="post-avatar">
            <div class="post-info">
                <h3>${post.author.name}</h3>
                <p>@${post.author.username}</p>
            </div>
            <div class="post-time">${formatTime(post.created_at)}</div>
        </div>
        
        <div class="post-content">
            <p>${post.content}</p>
            ${post.media_urls && post.media_urls.length > 0 ? 
                post.media_urls.map(url => {
                    if (url.match(/\.(jpg|jpeg|png|gif)$/i)) {
                        return `<img src="${url}" alt="Медиа" class="post-media">`;
                    } else if (url.match(/\.(mp4|avi|mov)$/i)) {
                        return `<video src="${url}" controls class="post-media"></video>`;
                    }
                    return '';
                }).join('') : ''
            }
        </div>
        
        <div class="post-actions">
            <div class="reactions">
                <button onclick="toggleReaction('${post.id}', 'like')" class="reaction-btn">
                    👍 <span id="like-count-${post.id}">${post.reactions?.like?.length || 0}</span>
                </button>
                <button onclick="toggleReaction('${post.id}', 'heart')" class="reaction-btn">
                    ❤️ <span id="heart-count-${post.id}">${post.reactions?.heart?.length || 0}</span>
                </button>
                <button onclick="toggleReaction('${post.id}', 'laugh')" class="reaction-btn">
                    😂 <span id="laugh-count-${post.id}">${post.reactions?.laugh?.length || 0}</span>
                </button>
                <button onclick="toggleReaction('${post.id}', 'angry')" class="reaction-btn">
                    😡 <span id="angry-count-${post.id}">${post.reactions?.angry?.length || 0}</span>
                </button>
                <button onclick="toggleReaction('${post.id}', 'cry')" class="reaction-btn">
                    😢 <span id="cry-count-${post.id}">${post.reactions?.cry?.length || 0}</span>
                </button>
                <button onclick="toggleReaction('${post.id}', 'dislike')" class="reaction-btn">
                    👎 <span id="dislike-count-${post.id}">${post.reactions?.dislike?.length || 0}</span>
                </button>
            </div>
            
            <div class="comments">
                <button onclick="toggleComments('${post.id}')" class="comment-btn">
                    💬 ${post.comments?.length || 0}
                </button>
            </div>
            
            ${post.author_id === app.currentUser?.id ? 
                `<button onclick="deletePost('${post.id}')" class="delete-btn">🗑️</button>` : ''
            }
        </div>
        
        <div id="comments-${post.id}" class="comments-section hidden">
            <div class="comments-list" id="comments-list-${post.id}"></div>
            <div class="comment-form">
                <textarea id="comment-input-${post.id}" placeholder="Написать комментарий..."></textarea>
                <button onclick="addComment('${post.id}')">Отправить</button>
            </div>
        </div>
    `;
    
    return div;
}

async function toggleReaction(postId, reactionType) {
    if (!app.currentUser) {
        showNotification('Войдите чтобы поставить реакцию', 'error');
        return;
    }
    
    try {
        const result = await window.db.toggleReaction(postId, app.currentUser.id, reactionType);
        
        // Обновляем счетчик
        const countElement = document.getElementById(`${reactionType}-count-${postId}`);
        if (countElement) {
            const currentCount = parseInt(countElement.textContent);
            countElement.textContent = result.action === 'added' ? currentCount + 1 : currentCount - 1;
        }
        
        showNotification(
            result.action === 'added' ? 'Реакция добавлена' : 'Реакция удалена',
            'info'
        );
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function deletePost(postId) {
    if (!confirm('Удалить пост?')) return;
    
    try {
        await window.db.deletePost(postId, app.currentUser.id);
        
        // Удаляем пост из ленты
        app.posts = app.posts.filter(post => post.id !== postId);
        displayPosts(app.posts);
        
        showNotification('Пост удален', 'success');
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    const commentsList = document.getElementById(`comments-list-${postId}`);
    
    if (commentsSection.classList.contains('hidden')) {
        commentsSection.classList.remove('hidden');
        
        // Загружаем комментарии
        try {
            const comments = await window.db.getComments(postId);
            displayComments(postId, comments);
            
            // Подписываемся на обновления комментариев
            subscribeToCommentsUpdates(postId);
            
        } catch (error) {
            showNotification(error.message, 'error');
        }
    } else {
        commentsSection.classList.add('hidden');
    }
}

async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    
    if (!content) {
        showNotification('Напишите комментарий', 'error');
        return;
    }
    
    try {
        const comment = await window.db.createComment(postId, app.currentUser.id, content);
        
        // Добавляем комментарий в список
        const commentsList = document.getElementById(`comments-list-${postId}`);
        const commentElement = createCommentElement(comment);
        commentsList.appendChild(commentElement);
        
        // Очищаем поле ввода
        input.value = '';
        
        showNotification('Комментарий добавлен', 'success');
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function displayComments(postId, comments) {
    const commentsList = document.getElementById(`comments-list-${postId}`);
    if (!commentsList) return;
    
    commentsList.innerHTML = '';
    
    comments.forEach(comment => {
        const commentElement = createCommentElement(comment);
        commentsList.appendChild(commentElement);
    });
}

function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment';
    div.innerHTML = `
        <div class="comment-header">
            <img src="${comment.author.avatar_url || 'default-avatar.png'}" alt="${comment.author.name}" class="comment-avatar">
            <div class="comment-info">
                <strong>${comment.author.name}</strong>
                <span class="comment-time">${formatTime(comment.created_at)}</span>
            </div>
        </div>
        <div class="comment-content">${comment.content}</div>
    `;
    
    return div;
}

// Поиск пользователей
async function handleSearch(input) {
    const query = typeof input === 'string' ? input : input?.target?.value || '';
    
    if (!query) {
        showScreen('feed');
        return;
    }
    
    if (query.length < 2) {
        showNotification('Введите минимум 2 символа', 'error');
        return;
    }
    
    try {
        const users = await window.db.searchUsers(query);
        displaySearchResults(users);
        showScreen('search');
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function displaySearchResults(users) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    
    searchResults.innerHTML = '';
    
    if (users.length === 0) {
        searchResults.innerHTML = '<p>Пользователи не найдены</p>';
        return;
    }
    
    users.forEach(user => {
        const userElement = createUserElement(user);
        searchResults.appendChild(userElement);
    });
}

function createUserElement(user) {
    const div = document.createElement('div');
    div.className = 'user-card';
    div.innerHTML = `
        <img src="${user.avatar_url || 'default-avatar.png'}" alt="${user.name}" class="user-avatar">
        <div class="user-info">
            <h3>${user.name}</h3>
            <p>@${user.username}</p>
            <p>${user.bio || ''}</p>
        </div>
        <button onclick="viewProfile('${user.id}')" class="btn-primary">Профиль</button>
    `;
    
    return div;
}

async function viewProfile(userId) {
    try {
        const profile = await window.db.getUserProfile(userId);
        const posts = await window.db.getUserPosts(userId);
        
        displayUserProfile(profile, posts);
        showScreen('profile');
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function displayUserProfile(profile, posts) {
    const profileContainer = document.getElementById('profileContainer');
    if (!profileContainer) return;
    
    profileContainer.innerHTML = `
        <div class="profile-header">
            <img src="${profile.avatar_url || 'default-avatar.png'}" alt="${profile.name}" class="profile-avatar">
            <div class="profile-info">
                <h1>${profile.name}</h1>
                <p>@${profile.username}</p>
                <p>${profile.bio || ''}</p>
            </div>
        </div>
        
        <div class="profile-stats">
            <div class="stat">
                <span class="stat-number">${posts.length}</span>
                <span class="stat-label">Посты</span>
            </div>
        </div>
        
        <div class="profile-posts">
            ${posts.map(post => createPostElement(post).outerHTML).join('')}
        </div>
    `;
}

// Real-time подписки
function subscribeToPostsUpdates() {
    const subscription = window.db.subscribeToPosts((payload) => {
        if (payload.eventType === 'INSERT') {
            app.posts.unshift(payload.new);
            displayPosts(app.posts);
        } else if (payload.eventType === 'DELETE') {
            app.posts = app.posts.filter(post => post.id !== payload.old.id);
            displayPosts(app.posts);
        }
    });
    
    app.subscriptions.push(subscription);
}

function subscribeToCommentsUpdates(postId) {
    const subscription = window.db.subscribeToComments(postId, (payload) => {
        if (payload.eventType === 'INSERT') {
            const commentsList = document.getElementById(`comments-list-${postId}`);
            if (commentsList) {
                const commentElement = createCommentElement(payload.new);
                commentsList.appendChild(commentElement);
            }
        }
    });
    
    app.subscriptions.push(subscription);
}

// Утилиты
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} д назад`;
    
    return date.toLocaleDateString('ru-RU');
}

function loadTheme() {
    const savedTheme = localStorage.getItem('clone_theme') || 'light';
    app.theme = savedTheme;
    document.body.className = savedTheme;
}

function toggleTheme() {
    app.theme = app.theme === 'light' ? 'dark' : 'light';
    document.body.className = app.theme;
    localStorage.setItem('clone_theme', app.theme);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Формы
    document.getElementById('registerFormElement')?.addEventListener('submit', handleRegister);
    document.getElementById('loginFormElement')?.addEventListener('submit', handleLogin);
    document.getElementById('postForm')?.addEventListener('submit', createPost);
    
    // Переключение форм
    document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
    });
    
    document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
    });
    
    // Поиск
    document.getElementById('searchInput')?.addEventListener('input', handleSearch);
    
    // Тема
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    
    // Навигация
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('feedBtn')?.addEventListener('click', () => showScreen('feed'));
    document.getElementById('profileBtn')?.addEventListener('click', () => viewProfile(app.currentUser.id));
    
    // Горячие клавиши
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            document.getElementById('searchInput')?.focus();
        }
    });
}

// Экспорт для использования в HTML
window.app = app;
window.handleRegister = handleRegister;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.createPost = createPost;
window.toggleReaction = toggleReaction;
window.deletePost = deletePost;
window.toggleComments = toggleComments;
window.addComment = addComment;
window.handleSearch = handleSearch;
window.viewProfile = viewProfile;
window.toggleTheme = toggleTheme;
