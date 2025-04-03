chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchUserDetails') {
    const { platform, username } = request;
    const apiUrl = `https://socialmediadeatils.onrender.com/${platform}/${username}`;
    
    console.log(`Fetching from: ${apiUrl}`);
    
    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('API response:', data);
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('Fetch error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
  
  if (request.action === 'verifyAccount') {
    const userData = request.userData;
    const apiUrl = 'https://fake-profile-detect-api.onrender.com/fraud_result';
    
    console.log('Sending data for verification:', userData);
    
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`⚠️ HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Verification API response:', data);
        // Assuming the API returns a fraudPercentage value
        sendResponse({ 
          success: true, 
          data: {
            fraudPercentage: data.fraudPercentage || data.fraud_percentage || parseFloat(data.percentage) || 0
          } 
        });
      })
      .catch(error => {
        console.error('⚠️ Verification error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
});