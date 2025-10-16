// On window load, check if an API key is already saved
window.onload = () => {
  chrome.storage.local.get("gemini_api_key", (storageData) => {
    const keyStatus = document.getElementById("keyStatus");
    keyStatus.textContent = storageData.gemini_api_key
      ? "API Key was stored!"
      : "Please enter and save your key above.";
  });
};

// Save API key
document.getElementById("saveKeyBtn").addEventListener("click", () => {
  const apiKey = document.getElementById("apiKeyInput").value.trim();
  const keyStatus = document.getElementById("keyStatus");

  if (!apiKey) {
    keyStatus.textContent = "Please enter your Gemini API key before saving.";
    return;
  }

  // Store the API key in Chrome's local storage
  chrome.storage.local.set({ gemini_api_key: apiKey }, () => {
    keyStatus.textContent = "API Key saved!";
    document.getElementById("apiKeyInput").value = ""; // clear input field
  });
});

// Handle Ask button click
document.getElementById("askBtn").addEventListener("click", async () => {
  const question = document.getElementById("promptInput").value.trim();
  const responseDiv = document.getElementById("response");

  if (!question) {
    responseDiv.textContent = "Ask a question.";
    return;
  }

  responseDiv.textContent = "Retrieving key...";

  // Retrieve stored API key
  chrome.storage.local.get("gemini_api_key", async (storageData) => {
    const apiKey = storageData.gemini_api_key;

    if (!apiKey) {
      responseDiv.textContent = "ERROR: API key not found. Please save it.";
      return;
    }

    responseDiv.textContent = "Thinking...";

    try {
      // Make POST request to Gemini API
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: question }]
              }
            ],
            generationConfig: {
              systemInstruction: {
                role: "system",
                parts: [
                  { text: "You are a concise, factual assistant. Always reply with short, direct explanations. Never use #H1 for markdown." }
                ]
              }
            }
          })
        }
      );

      const apiResponse = await res.json();
      console.log("Gemini API response:", apiResponse);

      // Display the AI response or error
      if (res.ok && apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
        responseDiv.textContent = apiResponse.candidates[0].content.parts[0].text;
      } else if (apiResponse.error) {
        responseDiv.textContent = `API error: ${apiResponse.error.message}`;
      } else {
        responseDiv.textContent = "Unexpected response structure. Check console for details.";
      }
    } catch (err) {
      responseDiv.textContent = "Network Error: " + err.message;
    }
  });
});
