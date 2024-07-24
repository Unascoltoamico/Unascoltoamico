const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let connectedUser = null;
let isAdminConnected = false;
let waitingList = [];
let disconnectedUsers = new Set();

// Configura nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ascoltologin@gmail.com', // Cambia con il tuo indirizzo email
        pass: 'vdye yosy aibt uwdn' // Cambia con la tua password per l'applicazione
    }
});

const sendNotificationEmail = (username) => {
    const mailOptions = {
        from: 'ascoltologin@gmail.com', // Cambia con il tuo indirizzo email
        to: 'ascoltologin@gmail.com', // Cambia con l'indirizzo email del destinatario
        subject: 'Nuovo login utente',
        text: `${username} ha effettuato il login`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Errore nell\'invio dell\'email: ', error);
        } else {
            console.log('Email inviata: ' + info.response);
        }
    });
};

app.use(helmet());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    socket.on('register', (username) => {
        if (disconnectedUsers.has(username) && (connectedUser || isAdminConnected)) {
            socket.emit('connectionStatus', 'blocked'); // Blocca l'utente disconnesso se qualcuno è connesso
            return;
        }

        if (username === 'arancione2004') {
            if (!isAdminConnected) {
                socket.username = 'un ascolto amico';
                isAdminConnected = true;
                socket.emit('connectionStatus', 'adminConnected');
                io.emit('chat message', { user: 'un ascolto amico', text: 'Un ascolto amico è entrato in chat! 🧡' });

                if (connectedUser) {
                    io.to(connectedUser.id).emit('connectionStatus', 'connected');
                }
            } else {
                socket.emit('connectionStatus', 'full'); // Admin già connesso
            }
        } else {
            if (!connectedUser) {
                socket.username = username;
                connectedUser = socket;
                socket.emit('connectionStatus', isAdminConnected ? 'connected' : 'waiting');
                io.emit('chat message', { user: 'Sistema', text: `${username} è in attesa di un ascolto amico.` });
                sendNotificationEmail(username); // Invia la notifica via email
            } else {
                waitingList.push(socket);
                socket.emit('connectionStatus', 'waiting'); // Utente in attesa
            }
        }
    });

    socket.on('chat message', (msg) => {
        if (socket.username === 'un ascolto amico') {
            msg.user = 'un ascolto amico';
        }
        io.emit('chat message', msg);
    });

    socket.on('disconnect user', () => {
        disconnectAllUsersExceptAdmin();
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            if (socket.username === 'un ascolto amico') {
                isAdminConnected = false;
                io.emit('chat message', { user: 'Chat', text: 'Un ascolto amico è uscito dalla chat.' });
                if (connectedUser) {
                    io.to(connectedUser.id).emit('connectionStatus', 'waiting'); // Metti l'utente in attesa
                }
            } else {
                io.emit('userDisconnected', `${socket.username} si è disconnesso`);
                disconnectedUsers.add(socket.username);  // Aggiungi il nome utente disconnesso al set
                if (connectedUser && connectedUser.id === socket.id) {
                    connectedUser = null;
                    processNextUserInQueue();
                } else {
                    waitingList = waitingList.filter(user => user.id !== socket.id);
                }
            }
        }
    });

    const processNextUserInQueue = () => {
        if (waitingList.length > 0 && !connectedUser) {
            connectedUser = waitingList.shift();
            connectedUser.emit('connectionStatus', isAdminConnected ? 'connected' : 'waiting');
            io.emit('chat message', { user: 'Sistema', text: `${connectedUser.username} è in attesa di un ascolto amico.` });
        }
    };

    const disconnectAllUsersExceptAdmin = () => {
        // Disconnetti l'utente connesso
        if (connectedUser) {
            io.to(connectedUser.id).emit('redirectToWaiting');
            io.emit('userDisconnected', `${connectedUser.username} si è disconnesso`);
            disconnectedUsers.add(connectedUser.username);  // Aggiungi il nome utente disconnesso al set
            connectedUser.disconnect(true);
            connectedUser = null;
        }
        // Disconnetti gli utenti in lista d'attesa
        waitingList.forEach(user => {
            io.to(user.id).emit('redirectToWaiting');
            disconnectedUsers.add(user.username);  // Aggiungi il nome utente disconnesso al set
            user.disconnect(true);
        });
        waitingList = [];
        // Non disconnettiamo l'amministratore
        io.emit('chat message', { user: 'Sistema', text: 'Tutti gli utenti sono stati disconnessi.' });
    };
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
