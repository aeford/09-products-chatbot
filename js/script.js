// Main function to initialize the chat interface
function initChat() {
    // Get all required DOM elements
    const chatToggle = document.getElementById('chatToggle');
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const chatMessages = document.getElementById('chatMessages');
    const openIcon = document.querySelector('.open-icon');
    const closeIcon = document.querySelector('.close-icon');

    // Toggle chat visibility and swap icons
    chatToggle.addEventListener('click', function() {
        chatBox.classList.toggle('active');
        openIcon.style.display = chatBox.classList.contains('active') ? 'none' : 'block';
        closeIcon.style.display = chatBox.classList.contains('active') ? 'block' : 'none';
    });


    // Store the conversation as an array of messages
    // The system prompt now tells the AI to ask 2-3 simple questions to help match the user to a rental, then recommend the top matches.
    const conversation = [
        {
            role: 'system',
            content:
                `You are Offbeat Assistant, a friendly vacation rental expert.\n\n` +
                `Your job is to help users find their perfect offbeat retreat using the rentals data provided.\n` +
                `First, ask the user 2 or 3 simple questions (one at a time) to learn about their preferences, such as location, type of experience, or favorite theme.\n` +
                `After you have enough information, recommend the top 1-2 rentals from the list, explaining why they are a good match.\n` +
                `Format your recommendations with line breaks or bullet points for clarity.\n` +
                `If you use bullet points, use dashes (-) for each item.\n` +
                `If you use line breaks, use double newlines (\\n\\n) between paragraphs.\n` +
                `Be friendly and conversational!\n` +
                `You will be given the full rentals data in the next message.`
        },
        // The rentals data will be added as the next message before each API call
    ];

    // Helper function to add a message to the chat window
    function addMessageToChat(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', role === 'user' ? 'user' : 'bot');
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Handle user input and process messages
    async function handleUserInput(e) {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;
        userInput.value = '';

        // Add user's message to chat and conversation
        addMessageToChat('user', message);
        conversation.push({ role: 'user', content: message });

        // Show typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot', 'typing');
        typingDiv.textContent = 'Assistant is typing...';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Fetch rentals.json data and add as a user message (so the AI always has the latest data)
        let rentalsData = '';
        try {
            const rentalsRes = await fetch('rentals.json');
            const rentalsJson = await rentalsRes.json();
            rentalsData = JSON.stringify(rentalsJson);
        } catch (err) {
            rentalsData = '';
        }

        // Always update or add the rentals data as the second message
        if (conversation.length < 2 || conversation[1].role !== 'user' || !conversation[1].content.startsWith('Rentals data:')) {
            conversation.splice(1, 0, { role: 'user', content: `Rentals data: ${rentalsData}` });
        } else {
            conversation[1].content = `Rentals data: ${rentalsData}`;
        }

        // Call OpenAI API
        let aiReply = 'Sorry, I could not get a response right now.';
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: conversation,
                    max_tokens: 800, // allow a bit more space for formatted output
                    temperature: 0.6 // slightly lower for clarity and friendliness
                })
            });
            const data = await response.json();
            if (data.choices && data.choices[0] && data.choices[0].message) {
                aiReply = data.choices[0].message.content;
                conversation.push({ role: 'assistant', content: aiReply });
            }
        } catch (error) {
            aiReply = 'Sorry, there was a problem connecting to the AI.';
        }

        // Remove typing indicator and show AI response
        chatMessages.removeChild(typingDiv);
        addMessageToChat('bot', aiReply);
    }

    // Listen for form submission
    document.getElementById('chatForm').addEventListener('submit', handleUserInput);
}

// Initialize the chat interface
initChat();
