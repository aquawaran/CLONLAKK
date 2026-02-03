// Supabase Database API
// Заменяет весь бэкенд на Supabase

class SupabaseDB {
    constructor() {
        this.supabase = window.supabaseClient;
    }

    // Аутентификация
    async register(email, password, username, name) {
        try {
            // Регистрация через Supabase Auth
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username,
                        name
                    }
                }
            });

            if (authError) throw authError;

            // Создание профиля в таблице users
            const { error: profileError } = await this.supabase
                .from('users')
                .insert([{
                    id: authData.user.id,
                    email,
                    username,
                    name,
                    password_hash: 'supabase_auth' // Пароль хранится в Supabase Auth
                }]);

            if (profileError) throw profileError;

            return authData.user;
        } catch (error) {
            throw new Error(`Ошибка регистрации: ${error.message}`);
        }
    }

    async login(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Получение данных профиля
            const { data: profile, error: profileError } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError) throw profileError;

            return { user: data.user, profile };
        } catch (error) {
            throw new Error(`Ошибка входа: ${error.message}`);
        }
    }

    async logout() {
        const { error } = await this.supabase.auth.signOut();
        if (error) throw error;
    }

    async getCurrentUser() {
        try {
            const { data: { user }, error: authError } = await this.supabase.auth.getUser();
            
            if (authError) throw authError;
            if (!user) return null;

            const { data: profile, error: profileError } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;

            return { user, profile };
        } catch (error) {
            console.error('Ошибка получения текущего пользователя:', error);
            return null;
        }
    }

    // Пользователи
    async updateUserProfile(userId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            throw new Error(`Ошибка обновления профиля: ${error.message}`);
        }
    }

    async searchUsers(query) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('id, username, name, avatar_url, bio')
                .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
                .limit(20);

            if (error) throw error;
            return data;
        } catch (error) {
            throw new Error(`Ошибка поиска: ${error.message}`);
        }
    }

    async getUserProfile(userId) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            throw new Error(`Ошибка получения профиля: ${error.message}`);
        }
    }

    // Посты
    async createPost(authorId, content, mediaUrls = []) {
        try {
            const { data, error } = await this.supabase
                .from('posts')
                .insert([{
                    author_id: authorId,
                    content,
                    media_urls: mediaUrls
                }])
                .select(`
                    *,
                    author:users(id, username, name, avatar_url)
                `)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            throw new Error(`Ошибка создания поста: ${error.message}`);
        }
    }

    async getPosts(limit = 20, offset = 0) {
        try {
            const { data, error } = await this.supabase
                .from('posts')
                .select(`
                    *,
                    author:users(id, username, name, avatar_url),
                    comments(count)
                `)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            return data;
        } catch (error) {
            throw new Error(`Ошибка получения постов: ${error.message}`);
        }
    }

    async getUserPosts(userId, limit = 20, offset = 0) {
        try {
            const { data, error } = await this.supabase
                .from('posts')
                .select(`
                    *,
                    author:users(id, username, name, avatar_url),
                    comments(count)
                `)
                .eq('author_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            return data;
        } catch (error) {
            throw new Error(`Ошибка получения постов пользователя: ${error.message}`);
        }
    }

    async deletePost(postId, userId) {
        try {
            const { error } = await this.supabase
                .from('posts')
                .delete()
                .eq('id', postId)
                .eq('author_id', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            throw new Error(`Ошибка удаления поста: ${error.message}`);
        }
    }

    // Комментарии
    async createComment(postId, authorId, content) {
        try {
            const { data, error } = await this.supabase
                .from('comments')
                .insert([{
                    post_id: postId,
                    author_id: authorId,
                    content
                }])
                .select(`
                    *,
                    author:users(id, username, name, avatar_url)
                `)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            throw new Error(`Ошибка создания комментария: ${error.message}`);
        }
    }

    async getComments(postId) {
        try {
            const { data, error } = await this.supabase
                .from('comments')
                .select(`
                    *,
                    author:users(id, username, name, avatar_url)
                `)
                .eq('post_id', postId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            throw new Error(`Ошибка получения комментариев: ${error.message}`);
        }
    }

    async deleteComment(commentId, userId) {
        try {
            const { error } = await this.supabase
                .from('comments')
                .delete()
                .eq('id', commentId)
                .eq('author_id', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            throw new Error(`Ошибка удаления комментария: ${error.message}`);
        }
    }

    // Реакции
    async toggleReaction(postId, userId, reactionType) {
        try {
            // Проверяем существующую реакцию
            const { data: existing, error: checkError } = await this.supabase
                .from('reactions')
                .select('*')
                .eq('post_id', postId)
                .eq('user_id', userId)
                .eq('type', reactionType);

            if (checkError) throw checkError;

            if (existing.length > 0) {
                // Удаляем существующую реакцию
                const { error } = await this.supabase
                    .from('reactions')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_id', userId)
                    .eq('type', reactionType);

                if (error) throw error;
                return { action: 'removed', type: reactionType };
            } else {
                // Добавляем новую реакцию
                const { error } = await this.supabase
                    .from('reactions')
                    .insert([{
                        post_id: postId,
                        user_id: userId,
                        type: reactionType
                    }]);

                if (error) throw error;
                return { action: 'added', type: reactionType };
            }
        } catch (error) {
            throw new Error(`Ошибка реакции: ${error.message}`);
        }
    }

    async getPostReactions(postId) {
        try {
            const { data, error } = await this.supabase
                .from('reactions')
                .select('type, user_id')
                .eq('post_id', postId);

            if (error) throw error;

            // Группируем реакции по типу
            const reactions = {
                like: [],
                dislike: [],
                heart: [],
                angry: [],
                laugh: [],
                cry: []
            };

            data.forEach(reaction => {
                if (reactions[reaction.type]) {
                    reactions[reaction.type].push(reaction.user_id);
                }
            });

            return reactions;
        } catch (error) {
            throw new Error(`Ошибка получения реакций: ${error.message}`);
        }
    }

    // Подписки
    async followUser(followerId, followingId) {
        try {
            const { error } = await this.supabase
                .from('followers')
                .insert([{
                    follower_id: followerId,
                    following_id: followingId
                }]);

            if (error) throw error;
            return true;
        } catch (error) {
            throw new Error(`Ошибка подписки: ${error.message}`);
        }
    }

    async unfollowUser(followerId, followingId) {
        try {
            const { error } = await this.supabase
                .from('followers')
                .delete()
                .eq('follower_id', followerId)
                .eq('following_id', followingId);

            if (error) throw error;
            return true;
        } catch (error) {
            throw new Error(`Ошибка отписки: ${error.message}`);
        }
    }

    async getFollowers(userId) {
        try {
            const { data, error } = await this.supabase
                .from('followers')
                .select(`
                    follower:users(id, username, name, avatar_url)
                `)
                .eq('following_id', userId);

            if (error) throw error;
            return data.map(f => f.follower);
        } catch (error) {
            throw new Error(`Ошибка получения подписчиков: ${error.message}`);
        }
    }

    async getFollowing(userId) {
        try {
            const { data, error } = await this.supabase
                .from('followers')
                .select(`
                    following:users(id, username, name, avatar_url)
                `)
                .eq('follower_id', userId);

            if (error) throw error;
            return data.map(f => f.following);
        } catch (error) {
            throw new Error(`Ошибка получения подписок: ${error.message}`);
        }
    }

    // Real-time подписки
    subscribeToPosts(callback) {
        return this.supabase
            .channel('posts')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'posts' },
                callback
            )
            .subscribe();
    }

    subscribeToComments(postId, callback) {
        return this.supabase
            .channel(`comments-${postId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
                callback
            )
            .subscribe();
    }

    subscribeToReactions(postId, callback) {
        return this.supabase
            .channel(`reactions-${postId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'reactions', filter: `post_id=eq.${postId}` },
                callback
            )
            .subscribe();
    }

    // Загрузка файлов в Supabase Storage
    async uploadFile(file, userId) {
        try {
            const fileName = `${userId}/${Date.now()}-${file.name}`;
            const { data, error } = await this.supabase.storage
                .from('avatars')
                .upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = this.supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            throw new Error(`Ошибка загрузки файла: ${error.message}`);
        }
    }

    async uploadPostMedia(file, userId) {
        try {
            const fileName = `posts/${userId}/${Date.now()}-${file.name}`;
            const { data, error } = await this.supabase.storage
                .from('posts-media')
                .upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = this.supabase.storage
                .from('posts-media')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            throw new Error(`Ошибка загрузки медиа: ${error.message}`);
        }
    }
}

// Экспорт для использования в приложении
window.SupabaseDB = SupabaseDB;
window.db = new SupabaseDB();
