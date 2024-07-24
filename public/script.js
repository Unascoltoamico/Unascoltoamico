const socket = io({
    path: '/socket.io'
  });
  
  const landingPage = document.getElementById('landing-page');
  const enterChatButton = document.getElementById('enter-chat-button');
  const loginContainer = document.getElementById('login-container');
  const chatContainer = document.getElementById('chat-container');
  const waitingContainer = document.getElementById('waiting-container');
  const loginButton = document.getElementById('login-button');
  const usernameInput = document.getElementById('username');
  const form = document.getElementById('form');
  const input = document.getElementById('input');
  const messages = document.getElementById('messages');
  const instagramIcon = document.getElementById('instagram-icon');
  const disconnectUserButton = document.getElementById('disconnect-user-button');
  
  let username = '';
  
  enterChatButton.addEventListener('click', () => {
    landingPage.style.display = 'none';
    loginContainer.style.display = 'flex';
  });
  
  usernameInput.addEventListener('input', () => {
    if (usernameInput.value.length > 20) {
      usernameInput.value = usernameInput.value.slice(0, 20);
    }
  });
  
  loginButton.addEventListener('click', () => {
    username = usernameInput.value.trim();
    if (username) {
      socket.emit('register', username);
    }
  });
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
      const message = {
        user: username,
        text: input.value.trim()
      };
      socket.emit('chat message', message);
      input.value = '';
    }
  });
  
  disconnectUserButton.addEventListener('click', () => {
    socket.emit('disconnect user');
  });
  
  socket.on('connectionStatus', (status) => {
    if (status === 'connected') {
      loginContainer.style.display = 'none';
      waitingContainer.style.display = 'none';
      chatContainer.style.display = 'flex';
      messages.innerHTML = '';  // Clear previous messages
    } else if (status === 'adminConnected') {
      loginContainer.style.display = 'none';
      waitingContainer.style.display = 'none';
      chatContainer.style.display = 'flex';
      disconnectUserButton.style.display = 'block';  // Mostra il pulsante per l'amministratore
      messages.innerHTML = '';  // Clear previous messages
    } else if (status === 'waiting') {
      loginContainer.style.display = 'none';
      waitingContainer.style.display = 'flex';
      chatContainer.style.display = 'none';  // Nasconde la chat
    } else if (status === 'full') {
      loginContainer.style.display = 'none';
      waitingContainer.style.display = 'flex'; // Mostra la schermata di attesa
      chatContainer.style.display = 'none';  // Nasconde la chat
    } else if (status === 'disconnected') {
      alert('Grazie mille🧡');
      window.location.reload();  // Ricarica la pagina per assicurarsi che l'utente non possa rientrare
    } else if (status === 'blocked') {
      alert('Ops, la chat è occupata! Riprova più tardi');
      chatContainer.style.display = 'none';
      waitingContainer.style.display = 'none';
      loginContainer.style.display = 'none';
    }
  });
  
  socket.on('chat message', (msg) => {
    const item = document.createElement('li');
    const userSpan = document.createElement('span');
    userSpan.textContent = `${msg.user}: `;
    userSpan.classList.add('username-span');  // Aggiungi la classe qui
    item.appendChild(userSpan);
  
    const textNode = document.createTextNode(msg.text);
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.appendChild(textNode);
    item.appendChild(messageContent);
    
    if (msg.user === username) {
      item.classList.add('sent');
    } else {
      item.classList.add('received');
    }
  
    messages.insertBefore(item, messages.firstChild);
    messages.scrollTop = messages.scrollHeight;
  });
  
  socket.on('userConnected', (msg) => {
    const item = document.createElement('li');
    item.textContent = msg;
    messages.insertBefore(item, messages.firstChild);
    messages.scrollTop = messages.scrollHeight;
  });
  
  socket.on('userDisconnected', (msg) => {
    const item = document.createElement('li');
    item.textContent = msg;
    messages.insertBefore(item, messages.firstChild);
    messages.scrollTop = messages.scrollHeight;
  });
  
  socket.on('userNotification', (msg) => {
    if (Notification.permission === 'granted') {
      new Notification('Notifica di login', { body: msg });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Notifica di login', { body: msg });
        }
      });
    }
  });
  
  socket.on('userLeft', () => {
    if (waitingContainer.style.display === 'flex') {
      waitingContainer.style.display = 'none';
      loginContainer.style.display = 'flex';
    }
  });
  
  socket.on('redirectToWaiting', () => {
    chatContainer.style.display = 'none';
    waitingContainer.style.display = 'flex';
    loginContainer.style.display = 'none';
  });
  