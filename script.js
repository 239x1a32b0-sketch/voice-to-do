const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// DOM Elements
const micBtn = document.getElementById('mic-btn');
const wrapper = document.querySelector('.mic-wrapper');
const statusText = document.getElementById('status-text');
const todoList = document.getElementById('todo-list');
const completedList = document.getElementById('completed-list'); // New
const textInput = document.getElementById('text-input');
const timeInput = document.getElementById('time-input');
const addBtn = document.getElementById('add-btn');
const alarmSound = document.getElementById('alarm-sound');

// --- 1. INITIALIZATION: Load from Local Storage ---
document.addEventListener('DOMContentLoaded', loadTasks);

function loadTasks() {
    const savedActive = JSON.parse(localStorage.getItem('activeTasks')) || [];
    const savedCompleted = JSON.parse(localStorage.getItem('completedTasks')) || [];

    savedActive.forEach(task => createItemDOM(task.text, task.time, false));
    savedCompleted.forEach(task => createItemDOM(task.text, task.time, true));
}

function saveTasks() {
    const activeTasks = [];
    const completedTasks = [];

    // Gather Active
    todoList.querySelectorAll('li').forEach(li => {
        activeTasks.push({
            text: li.querySelector('.text-span').textContent,
            time: li.dataset.alarmTime || ""
        });
    });

    // Gather Completed
    completedList.querySelectorAll('li').forEach(li => {
        completedTasks.push({
            text: li.querySelector('.text-span').textContent,
            time: li.dataset.alarmTime || ""
        });
    });

    localStorage.setItem('activeTasks', JSON.stringify(activeTasks));
    localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
}

// --- 2. CORE: Create DOM Element ---
function createItemDOM(text, timeStr, isCompleted) {
    const li = document.createElement('li');

    const span = document.createElement('span');
    span.textContent = text;
    span.className = "text-span";
    li.appendChild(span);

    if (timeStr) {
        const timeBadge = document.createElement('span');
        timeBadge.className = 'task-time';
        timeBadge.textContent = timeStr;
        li.appendChild(timeBadge);
        li.dataset.alarmTime = timeStr;
    }

    // INTERACTION: Click to Move or Restore
    li.addEventListener('click', () => {
        if (li.classList.contains('ringing')) {
            // Stop alarm if ringing
            li.classList.remove('ringing');
            alarmSound.pause();
            return;
        }

        if (li.parentNode === todoList) {
            // Move to History
            li.classList.add('move-down');
            li.addEventListener('animationend', () => {
                li.classList.remove('move-down');
                completedList.appendChild(li); // Move to bottom list
                saveTasks();
            }, { once: true });
        } else {
            // Restore to Active
            li.classList.add('move-up');
            li.addEventListener('animationend', () => {
                li.classList.remove('move-up');
                todoList.appendChild(li); // Move back to top
                saveTasks();
            }, { once: true });
        }
    });

    // Append to correct list initially
    if (isCompleted) completedList.appendChild(li);
    else todoList.appendChild(li);
}

// Wrapper for new inputs
function createItem(text, timeStr) {
    if (!text || text.trim() === "") return;
    createItemDOM(text, timeStr, false);
    saveTasks();
    speak("Added " + text);
}

// --- 3. UTILS ---
function clearHistory() {
    completedList.innerHTML = '';
    saveTasks();
}

// Input Event Listeners
addBtn.addEventListener('click', () => {
    createItem(textInput.value, timeInput.value);
    textInput.value = '';
    timeInput.value = '';
});

textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        createItem(textInput.value, timeInput.value);
        textInput.value = '';
        timeInput.value = '';
    }
});

// --- 4. ALARM LOGIC (Same as before) ---
let lastCheckedMinute = -1;

setInterval(() => {
    const now = new Date();
    const currentMinute = now.getMinutes();

    // Only check once per minute is sufficient, as long as we catch it within that minute.
    // However, to be responsive, we check if we've already processed this minute.
    // But wait, the original logic wanted to trigger "at the time". 
    // Let's stick to checking every second but be more lenient or state-based.

    // Better approach: Check if the current time matches an alarm time AND it hasn't rung yet for this minute.
    // The previous logic `if (now.getSeconds() !== 0) return;` was too strict (could miss if browser lags).

    // Let's just match the HH:MM string. If it matches, ensure we haven't already started ringing *recently* (relying on 'ringing' class is good, but let's be safe).

    const currentStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    todoList.querySelectorAll('li').forEach(li => {
        // If time matches
        if (li.dataset.alarmTime === currentStr) {
            // And not already ringing
            if (!li.classList.contains('ringing')) {
                li.classList.add('ringing');
                alarmSound.play().catch(e => console.log(e));
                speak(`Time for ${li.querySelector('.text-span').textContent}`);
            }
        }
    });
}, 1000);

// --- 5. VOICE LOGIC ---
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';

    micBtn.addEventListener('click', () => {
        if (wrapper.classList.contains('listening')) recognition.stop();
        else recognition.start();
    });

    recognition.onstart = () => {
        wrapper.classList.add('listening');
        statusText.textContent = "Listening...";
    };

    recognition.onend = () => {
        wrapper.classList.remove('listening');
        statusText.textContent = "Tap mic or type...";
    };

    recognition.onresult = (e) => {
        const command = e.results[0][0].transcript.toLowerCase();
        if (command.startsWith('add')) {
            createItem(command.replace(/^add\s+/, ''));
        }
    };
}

function speak(msg) {
    const speech = new SpeechSynthesisUtterance(msg);
    window.speechSynthesis.speak(speech);
}