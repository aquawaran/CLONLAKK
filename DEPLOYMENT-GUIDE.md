# 🚀 Развертывание Clone 24/7 (Продакшн конфигурация)

## 🏆 Рекомендуемая конфигурация

### **Инфраструктура:**
- **VPS сервер:** DigitalOcean/Vultr (от $5/мес)
- **База данных:** MongoDB Atlas (бесплатный tier)
- **Домен:** любой домен (~$10/год)
- **SSL:** Let's Encrypt (бесплатно)

---

## 📋 Пошаговая инструкция

### 1. **Создание VPS сервера**

**DigitalOcean:**
1. Зарегистрируйтесь на digitalocean.com
2. Создайте Droplet:
   - Ubuntu 22.04 LTS
   - 2GB RAM, 1 CPU, 25GB SSD ($5/мес)
   - Выберите регион ближе к пользователям

### 2. **Настройка сервера**

```bash
# Подключитесь к серверу по SSH
ssh root@your-server-ip

# Обновление системы
apt update && apt upgrade -y

# Установка Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Установка PM2 для управления процессами
npm install -g pm2

# Установка Nginx для reverse proxy
apt install nginx -y

# Установка Git
apt install git -y
```

### 3. **Настройка MongoDB Atlas**

1. Зарегистрируйтесь на mongodb.com/atlas
2. Создайте бесплатный кластер (512MB)
3. Настройте whitelist IP адресов (0.0.0.0/0 для всех)
4. Создайте пользователя базы данных
5. Получите connection string

### 4. **Подготовка приложения**

**Создайте файл `.env`:**
```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/clone?retryWrites=true&w=majority
DOMAIN=yourdomain.com
```

**Обновите server.js для MongoDB:**
```javascript
const mongoose = require('mongoose');

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Модели данных
const User = new mongoose.Schema({
    name: String,
    username: String,
    email: String,
    password: String,
    avatar: String,
    bio: String,
    createdAt: Date
});

const Post = new mongoose.Schema({
    authorId: String,
    content: String,
    media: Array,
    reactions: Object,
    comments: Array,
    createdAt: Date
});
```

### 5. **Развертывание приложения**

```bash
# Клонирование проекта
git clone <ваш-git-репозиторий>
cd Clone

# Установка зависимостей
npm install

# Установка дополнительных пакетов для продакшена
npm install mongoose express-mongo-sanitize express-validator

# Запуск через PM2
pm2 start server.js --name "clone-social"

# Настройка автозапуска
pm2 startup
pm2 save
```

### 6. **Настройка Nginx**

**Создайте файл конфигурации:**
```bash
nano /etc/nginx/sites-available/clone
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Активация конфигурации
ln -s /etc/nginx/sites-available/clone /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 7. **Настройка SSL с Let's Encrypt**

```bash
# Установка Certbot
apt install certbot python3-certbot-nginx -y

# Получение SSL сертификата
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Автоматическое обновление
crontab -e
# Добавьте строку:
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 💰 Стоимость инфраструктуры

| Услуга | Стоимость в месяц |
|--------|------------------|
| VPS сервер | $5 |
| MongoDB Atlas | $0 (бесплатный tier) |
| Домен | $1-2 |
| **Итого:** | **~$7/мес** |

---

## 🔧 Мониторинг и обслуживание

### **PM2 команды:**
```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs clone-social

# Перезапуск
pm2 restart clone-social

# Обновление
git pull
pm2 restart clone-social
```

### **Резервное копирование:**
```bash
# Создайте скрипт backup.sh
#!/bin/bash
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/clone" --out=/backup/$(date +%Y%m%d)
tar -czf /backup/clone-$(date +%Y%m%d).tar.gz /backup/$(date +%Y%m%d)
```

### **Мониторинг:**
```bash
# Установка мониторинга
npm install -g pm2-logrotate
pm2 install pm2-server-monit
```

---

## 🚀 Масштабирование

Когда сайт вырастет:

1. **Улучшите VPS:** 4GB RAM, 2 CPU ($20/мес)
2. **MongoDB Pro:** $25/мес для большего хранилища
3. **CDN:** Cloudflare для ускорения
4. **Load Balancer:** для распределения нагрузки

---

## 📱 Доступ для пользователей

После настройки пользователи смогут:

1. **Зайти на сайт:** https://yourdomain.com
2. **Зарегистрироваться:** с любого устройства
3. **Публиковать посты:** текст, фото, видео
4. **Общаться:** реакции, комментарии, подписки
5. **Получать уведомления:** в реальном времени

---

## 🔒 Безопасность

1. **Firewall:**
```bash
ufw allow ssh
ufw allow 'Nginx Full'
ufw enable
```

2. **Регулярные обновления:**
```bash
apt update && apt upgrade -y
```

3. **Резервные копии:** ежедневно

---

## 📊 Ожидаемая производительность

- **Пользователей:** до 1000 одновременных
- **Постов:** до 10,000 в день
- **Файлов:** до 100GB на бесплатном MongoDB
- **Время работы:** 99.9% uptime

---

**Готово к запуску! 🎉**

После этих шагов ваша социальная сеть будет работать 24/7 как настоящий продакшн-проект!
