var Chat = (function () {
  let messages = []
  // Front end related

  // Elements
  const chatWindowElement = document.querySelector('#chat-window')
  const chatUsersElement = document.querySelector('#chat-users')
  const searchResultsElement = document.querySelector('#search-window-results')

  // Templates
  const userTemplate = ({ username }) => `
    <li class="media my-2">
      <div class="media-body">
        <b class="text-secondary">${username}</b>
      </div>
    </li>
  `

  const messageTemplate = ({text, user}) => `
    <div class="media my-3 chat-message">
      <div class="media-body">
        <div class="mt-0"><b>${user.username}</b></div>
        <p>
          ${text}
        </p>
      </div>
    </div>
  `

  // Private frontend module - only available within the chat module
  let frontend = {}

  // If the chat window is near the bottom
  // Then scroll complete down
  // Used to auto scroll down to display new messages
  frontend.autoScroll = function () {
    let cW = chatWindowElement

    if (cW.offsetHeight / (cW.scrollHeight - cW.scrollTop) > 0.85) {
        cW.scrollTop += 150
      }
  }

  // Helper method to clear the online user list
  frontend.clearUsers = function () {
      chatUsersElement.innerHTML = ''
  }

  // Add a user to the online list
  frontend.addUser = function (user) {
    let html = userTemplate(user)

    // Set the new HTML add the end of the list
    chatUsersElement.insertAdjacentHTML('beforeend', html)
  }

  // Add a message to the chat window
  frontend.addMessage = function (message) {
    let html = messageTemplate(message)

    chatWindowElement.insertAdjacentHTML('beforeend', html)

    // Auto scroll to bottom if the is not scroll to much up
    // e.g. when reading older messages
    frontend.autoScroll()
  }

  // Helper method to generate all html of an array of messages
  frontend.getMessagesHTML = function (messages) {
    let html = ''

    messages.forEach(m => {
      html += messageTemplate(m)
    })

    return html
  }

  // Method to display a specific array of messages in the chat window
  frontend.displayMessages = function (messages) {
    chatWindowElement.innerHTML = frontend.getMessagesHTML(messages)
  }

  // Method to display a specific array of messages in the search results
  frontend.displaySearchResults = function (messages) {
    searchResultsElement.innerHTML = frontend.getMessagesHTML(messages)
  }

  // Initializing an empty object via object literal notation
  let module = {}

  // Method for sending a message
  module.sendMessage = function (message) {
    // The "credentials" option makes sure that the browser's cookies
    // are sent back and forth during a request
    // Please refer to the fetch() docs: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    let options = {
        method: 'post',
        credentials: 'include',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify(message)
    }

    fetch('/api/messages', options)
    .then(response => response.json())
    .then(response => {
        if (response.status != 'OK') {
            alert(response.message)
        }
    })
  }

  // Returns the messages array
  module.getMessages = function () {
    // The credentials option makes sure that the browsers cookies
    // are sent back and forth during a request
    let options = {
        credentials: 'include'
    }

    return fetch('/api/messages', options)
    .then(response => response.json())
  }

  // Searches the messages array
  module.searchMessages = function (searchString) {
    let search = new RegExp(searchString, 'i')

    return {
      results: messages.filter(m => {
        return m.text.search(search) > -1 || m.user.username.search(search) > -1
      })
    }
  }

  module.displaySearchResults = function (messages) {
    frontend.displaySearchResults(messages)
  }

  // Function which sets up listeners for Socket.io events
  // And loads initial messages to the chat window
  function initialize() {
    // Setup the socket
    let socket = io()

    // What to do when the "new message" event is received
    socket.on('new message', message => {
        // Push the message to our internal array (used for local search)
        messages.push(message)
        
        // Add the message to the chat window
        frontend.addMessage(message)
    })

    // What to do when the "online users" event is received
    // The event contains a list of current online users
    socket.on('online users', users => {
        // First we clear the current list
        frontend.clearUsers()
  
        // Then we add each of the users from the updated list
        users.forEach(user => {
            frontend.addUser(user)
        })
    })
    
    // Load all messages and display them
    module.getMessages()
    .then(allMessages => {
        messages = allMessages

        frontend.displayMessages(messages)
    })
  }

  // Run the initialize function
  initialize()

  return module
})()

function ChatMessage (text) {
  this.text = text
}

document.querySelector('#chat-form').addEventListener('submit', event => {
  event.preventDefault()

  let input = document.querySelector('#chatMessage')

  let text = input.value
  let newMessageObject = new ChatMessage(text)

  Chat.sendMessage(newMessageObject)

  input.value = ''
})

document.querySelector('#search-form').addEventListener('submit', event => {
  event.preventDefault()

  let input = document.querySelector('#search-input')
  let value = input.value

  if (value == '') {
    document.querySelector('#chat-window').classList.remove('hidden')
    document.querySelector('#search-window').classList.add('hidden')
    return
  }

  document.querySelector('#chat-window').classList.add('hidden')
  document.querySelector('#search-window').classList.remove('hidden')
  document.querySelector('#search-window-string').innerHTML = value

  let results = Chat.searchMessages(value)

  Chat.displaySearchResults(results.results)
})