const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Налаштовуємо статичні файли, щоб сервер міг знаходити styles.css
app.use(express.static(__dirname)); // Вказуємо корінь проекту

// Обробка кореневого запиту для відправки HTML файлу
app.get('/', (req, res) => {
   res.sendFile(__dirname + '/index.html'); // Відправляємо index.html
});

let players = []; // Зберігаємо підключення гравців

wss.on('connection', (ws) => {
   if (players.length >= 2) {
      ws.send(JSON.stringify({ type: 'error', message: 'Гра вже заповнена' }));
      ws.close();
      return;
   }

   players.push({ ws, hits: 0 });

   ws.send(JSON.stringify({ type: 'info', message: 'Чекаємо другого гравця...' }));
   if (players.length === 2) {
      players.forEach((player) =>
         player.ws.send(JSON.stringify({ type: 'start', message: 'Гра почалась!' }))
      );
   }

   ws.on('message', (message) => {
      const player = players.find((p) => p.ws === ws);
      if (!player) return;

      if (players.length === 2) {
         player.hits += 1;
         if (player.hits >= 5) {
            players.forEach((p) =>
               p.ws.send(
                  JSON.stringify({
                     type: 'end',
                     message: `${player.ws === p.ws ? 'Ви перемогли!' : 'Ви програли!'}`,
                  })
               )
            );
            players.forEach((p) => p.ws.close());
            players = [];
         } else {
            players.forEach((p) =>
               p.ws.send(
                  JSON.stringify({
                     type: 'update',
                     hits: player.hits,
                     message: `${player.ws === p.ws ? 'Ваш удар!' : 'Суперник атакував!'}`,
                  })
               )
            );
         }
      }
   });

   ws.on('close', () => {
      players = players.filter((p) => p.ws !== ws);
      players.forEach((p) =>
         p.ws.send(JSON.stringify({ type: 'info', message: 'Суперник вийшов із гри.' }))
      );
   });
});

const port = process.env.PORT || 10000;
server.listen(port, () => {
   console.log(`Server is running on port ${port}`);
});
