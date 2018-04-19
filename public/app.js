var Chat = (function () {
  // Local arrays to keep track of data
  let users = []
  let messages = []
  let filteredMessages = []

  // Array containing banned words
  let bannedWords = ['word1', 'word2', 'word3']

  // Front end related

  // Elements
  const chatWindowElement = document.querySelector('#chat-window')
  const chatUsersElement = document.querySelector('#chat-users')
  const searchResultsElement = document.querySelector('#search-window-results')

  // Templates
  const userTemplate = ({ username, avatar }) => `
    <li class="media my-2">
      <img src="${avatar}" width="20" class="align-self-center mr-2 rounded">
      <div class="media-body">
        <b class="text-secondary">${username}</b>
      </div>
    </li>
  `

  const messageTemplate = ({message, user}) => `
    <div class="media my-3 chat-message">
      <img src="${user.avatar}" alt="" class="mr-3 rounded" width="50">
      <div class="media-body">
        <div class="mt-0"><b>${user.name}</b></div>
        <p>
          ${message}
        </p>
      </div>
    </div>
  `

  // Private frontend module
  let frontend = {}

  frontend.autoScroll = function () {
    let cW = chatWindowElement

    if (cW.offsetHeight / (cW.scrollHeight - cW.scrollTop) > 0.85) {
        cW.scrollTop += 150
      }
  }

  frontend.addUser = function (user) {
    let html = userTemplate(user)

    chatUsersElement.insertAdjacentHTML('beforeend', html)
  }

  frontend.addMessage = function (message) {
    let html = messageTemplate(message)

    chatWindowElement.insertAdjacentHTML('beforeend', html)

    frontend.autoScroll()
  }

  frontend.getMessagesHTML = function (messages) {
    let html = ''

    messages.forEach(m => {
      html += messageTemplate(m)
    })

    return html
  }

  frontend.displayMessages = function (messages) {
    chatWindowElement.innerHTML = front.getMessagesHTML(messages)
  }

  frontend.displaySearchResults = function (messages) {
    searchResultsElement.innerHTML = frontend.getMessagesHTML(messages)
  }

  // Initializing an empty object via object literal notation
  let module = {}

  // Adds joinChat method to the module
  module.joinChat = function (user) {
    // .some method returns true/false depending if one or more elements
    // matched the condition
    if (users.some(u => u == user)) {
      console.log('Identical user already connected!')
    } else {
      users.push(user)
      frontend.addUser(user)
    }
  }

  // Method for removing user from chat
  module.leaveChat = function (user) {
    users = users.filter(u => u !== user)
  }

  // Returns the users array
  module.getUsers = function () {
    return users
  }

  // Method for sending a message
  module.sendMessage = function (message) {
    // Should the message be censored?
    let censor = false

    // Check if the message contains a banned word
    bannedWords.forEach(word => {
      if (message.message.indexOf(word) > -1) {
        censor = true
      }
    })

    if (censor) {
      console.log('Message got censored', message)
      filteredMessages.push(message)
    } else {
      messages.push(message)
      frontend.addMessage(message)
    }
  }

  // Returns the messages array
  module.getMessages = function () {
    return messages
  }

  // Searches the messages array
  module.searchMessages = function (searchString) {
    let search = new RegExp(searchString, 'i')

    return {
      results: messages.filter(m => {
        return m.message.search(search) > -1 || m.user.name.search(search) > -1
      })
    }
  }

  module.displaySearchResults = function (messages) {
    frontend.displaySearchResults(messages)
  }

  return module
})()

function ChatMessage (message, user) {
  this.message = message
  this.user = user
  this.createdAt = new Date()
}

function ChatUser (name, username, avatar) {
  this.name = name
  this.username = username
  this.avatar = avatar
  this.joinedAt = new Date()
}

// Add a single user
// let user = new ChatUser(prompt('What is your name?'), prompt('What is your username/alias?'))
// let user = new ChatUser('Henning Horn', 'henninghorn', 'http://gravatar.com/avatar/8557ba783f6d6cbf07f22f8bc9b89d55')
// Chat.joinChat(user)

document.querySelector('#chat-form').addEventListener('submit', event => {
  event.preventDefault()

  let input = document.querySelector('#chatMessage')

  let message = input.value
  let newMessageObject = new ChatMessage(message, user)

  Chat.sendMessage(newMessageObject)

  input.value = ''
})

document.querySelector('#search-form').addEventListener('submit', event => {
  event.preventDefault()

  let input = document.querySelector('#search-input')
  let value = input.value

  if (value == '') {
    hideSearch()
    return
  }

  document.querySelector('#chat-window').classList.add('hidden')
  document.querySelector('#search-window').classList.remove('hidden')
  document.querySelector('#search-window-string').innerHTML = value

  let results = Chat.searchMessages(value)

  Chat.displaySearchResults(results.results)
})

function hideSearch () {
  document.querySelector('#chat-window').classList.remove('hidden')
  document.querySelector('#search-window').classList.add('hidden')
}

function randomMessage(user) {
  let quotes = [
    'I am not in danger, Skyler. I am the danger!',
    'If you don’t know who I am, then maybe your best course would be to tread lightly.',
    'Fuck you, and your eyebrows!',
    'Stay out of my territory.',
    'We’re done when I say we’re done.',
    'I watched Jane die. I was there. And I watched her die. I watched her overdose and choke to death. I could have saved her. But I didn’t.',
    'I won.',
    'Say My Name.',
    'Because I say so.',
    'Cheer up beautiful people… this is where you get to make it right.',
    'Chemistry is, well technically, chemistry is the study of matter. But I prefer to see it as the study of change.'
  ]

  let message = new ChatMessage(quotes[(Math.floor(Math.random() * quotes.length))], user)

  Chat.sendMessage(message)

  window.setTimeout(() => {
    randomMessage(user)
  }, Math.floor(Math.random() * 10000) + 2000)
}