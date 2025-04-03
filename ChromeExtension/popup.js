document.addEventListener('DOMContentLoaded', function() {
  const currentSiteElement = document.getElementById('current-site');
  const fetchButton = document.getElementById('fetch-button');
  const verifyButton = document.getElementById('verify-button');
  const statusElement = document.getElementById('status');
  const resultsElement = document.getElementById('results');
  const verificationResultsElement = document.getElementById('verification-results');
  
  let currentUserData = null; // Store fetched user data
  
  // Get current tab URL
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = tabs[0].url;
    
    // Detect platform and extract username from URL
    const platformInfo = detectPlatformAndUsername(currentUrl);
    
    if (platformInfo) {
      currentSiteElement.innerHTML = `
        <div><span class="info-label">Platform:</span> <span class="username">${platformInfo.platform}</span></div>
        <div><span class="info-label">Username:</span> <span class="username">${platformInfo.username}</span></div>
      `;
      
      // Enable button
      fetchButton.disabled = false;
      
      // Add click event
      fetchButton.addEventListener('click', function() {
        fetchUserDetails(platformInfo.platform, platformInfo.username);
      });
    } else {
      currentSiteElement.innerHTML = `
        <div style="text-align: center; color: #666;">
          Not on a supported social media platform.<br>
          Please visit a profile on Instagram, Facebook, Twitter/X, or LinkedIn.
        </div>
      `;
      fetchButton.disabled = true;
    }
  });
  
  // Add click event for verify button
  verifyButton.addEventListener('click', function() {
    if (currentUserData) {
      verifyAccount(currentUserData);
    }
  });
  
  function detectPlatformAndUsername(url) {
    const urlPatterns = {
      instagram: {
        pattern: /https?:\/\/(www\.)?instagram\.com\/([^/?]+)/i,
        platform: 'instagram'
      },
      facebook: {
        pattern: /https?:\/\/(www\.)?facebook\.com\/([^/?]+)/i,
        platform: 'facebook'
      },
      twitter: {
        pattern: /https?:\/\/(www\.)?twitter\.com\/([^/?]+)/i,
        platform: 'twitter'
      },
      x: {
        pattern: /https?:\/\/(www\.)?x\.com\/([^/?]+)/i,
        platform: 'x'
      },
      linkedin: {
        pattern: /https?:\/\/(www\.)?linkedin\.com\/in\/([^/?]+)/i,
        platform: 'linkedin'
      }
    };
    
    for (const key in urlPatterns) {
      const match = url.match(urlPatterns[key].pattern);
      if (match && match[2]) {
        return {
          platform: urlPatterns[key].platform,
          username: match[2]
        };
      }
    }
    
    return null;
  }
  
  function fetchUserDetails(platform, username) {
    // Show loading and disable button
    statusElement.innerHTML = `
      <div style="display: flex; align-items: center;">
        <div style="border: 3px solid #f3f3f3; border-top: 3px solid #0095f6; border-radius: 50%; width: 20px; height: 20px; margin-right: 10px; animation: spin 1s linear infinite;"></div>
        Loading data... This may take a moment.
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    statusElement.style.display = 'block';
    fetchButton.disabled = true;
    fetchButton.textContent = 'Fetching...';
    resultsElement.innerHTML = '';
    verificationResultsElement.style.display = 'none';
    verifyButton.disabled = true;
    
    // Use the background script to fetch data
    chrome.runtime.sendMessage(
      { 
        action: 'fetchUserDetails', 
        platform, 
        username 
      },
      function(response) {
        // Re-enable button
        fetchButton.disabled = false;
        fetchButton.textContent = 'Fetch Details';
        
        // Hide loading
        statusElement.style.display = 'none';
        
        if (response && response.success) {
          const data = response.data;
          currentUserData = data; // Store the fetched data
          
          // Display results
          if (data && data.data) {
            displayNestedData(data.data);
            
            // Enable verify button
            verifyButton.disabled = false;
            verifyButton.classList.add('highlight-button');
            setTimeout(() => {
              verifyButton.classList.remove('highlight-button');
            }, 2000);
          } else {
            resultsElement.innerHTML = '<div style="color: #666; padding: 10px;">No data found for this user.</div>';
          }
        } else {
          // Handle errors
          statusElement.innerHTML = `
            <div style="color: #d9534f; padding: 10px;">
              Error: ${response ? response.error : 'Failed to fetch data'}. Please try again.
            </div>
          `;
        }
      }
    );
    
    // Set timeout to handle no response from background script
    setTimeout(() => {
      if (fetchButton.disabled) {
        fetchButton.disabled = false;
        fetchButton.textContent = 'Retry Fetch';
        statusElement.innerHTML = `
          <div style="color: #d9534f; padding: 10px;">
            Request timed out. The server might be busy or temporarily down. Please try again later.
          </div>
        `;
      }
    }, 30000);
  }
  
  function verifyAccount(userData) {
    // Show loading
    verifyButton.disabled = true;
    verifyButton.textContent = 'Verifying...';
    statusElement.innerHTML = `
      <div style="display: flex; align-items: center;">
        <div style="border: 3px solid #f3f3f3; border-top: 3px solid #0095f6; border-radius: 50%; width: 20px; height: 20px; margin-right: 10px; animation: spin 1s linear infinite;"></div>
        Verifying account... This may take a moment.
      </div>
    `;
    statusElement.style.display = 'block';
    verificationResultsElement.style.display = 'none';
    
    // Send the data to your fraud detection API
    chrome.runtime.sendMessage(
      { 
        action: 'verifyAccount', 
        userData: userData 
      },
      function(response) {
        // Reset button and status
        verifyButton.disabled = false;
        verifyButton.textContent = 'Verify Account';
        statusElement.style.display = 'none';
        
        if (response && response.success) {
          // Display verification results
          displayVerificationResults(response.data);
        } else {
          // Handle errors
          statusElement.innerHTML = `
            <div style="color: #d9534f; padding: 10px;">
              Error: ${response ? response.error : 'Failed to verify account'}. Please try again.
            </div>
          `;
          statusElement.style.display = 'block';
        }
      }
    );
    
    // Set timeout for no response
    setTimeout(() => {
      if (verifyButton.disabled) {
        verifyButton.disabled = false;
        verifyButton.textContent = 'Verify Account';
        statusElement.innerHTML = `
          <div style="color: #d9534f; padding: 10px;">
            Verification timed out. The server might be busy. Please try again later.
          </div>
        `;
        statusElement.style.display = 'block';
      }
    }, 30000);
  }
  
  function displayVerificationResults(data) {
    // Extract the fraud percentage (assuming it's returned in the data)
    const fraudPercentage = data.fraudPercentage || 0;
    
    // Determine risk level
    let riskLevel, riskClass;
    if (fraudPercentage < 30) {
      riskLevel = "Low Risk";
      riskClass = "risk-low";
    } else if (fraudPercentage < 70) {
      riskLevel = "Medium Risk";
      riskClass = "risk-medium";
    } else {
      riskLevel = "High Risk";
      riskClass = "risk-high";
    }
    
    // Create the pie chart for the fraud percentage
    verificationResultsElement.innerHTML = `
      <h3>Account Verification Results</h3>
      <div class="chart-container">
        <svg viewBox="0 0 36 36" class="circular-chart">
          <path class="circle-bg"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#eee"
            stroke-width="3"
          />
          <path class="circle"
            stroke-dasharray="${fraudPercentage}, 100"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="${fraudPercentage < 30 ? '#28a745' : fraudPercentage < 70 ? '#ffc107' : '#dc3545'}"
            stroke-width="3"
          />
          <text x="18" y="20.35" class="percentage">${fraudPercentage}%</text>
        </svg>
        <div class="percentage-display">${fraudPercentage}%</div>
      </div>
      
      <div class="verification-details">
        <p>This account shows indicators of potential fraud.</p>
        <div class="risk-level ${riskClass}">${riskLevel}</div>
      </div>
      
      <style>
        .circular-chart {
          display: block;
          margin: 0 auto;
          max-width: 100%;
        }
        .circle-bg {
          fill: none;
          stroke: #eee;
          stroke-width: 3;
        }
        .circle {
          fill: none;
          stroke-width: 3;
          stroke-linecap: round;
          animation: progress 1s ease-out forwards;
        }
        @keyframes progress {
          0% {
            stroke-dasharray: 0 100;
          }
        }
        .percentage {
          fill: #666;
          font-family: sans-serif;
          font-size: 0.5em;
          text-anchor: middle;
        }
        
        .highlight-button {
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 149, 246, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(0, 149, 246, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 149, 246, 0);
          }
        }
      </style>
    `;
    
    verificationResultsElement.style.display = 'block';
    
    // Scroll to the verification results
    verificationResultsElement.scrollIntoView({ behavior: 'smooth' });
  }
  
  function displayNestedData(data) {
    resultsElement.innerHTML = '';
    
    // Handle ProfileInfo section
    if (data.ProfileInfo) {
      const profileSection = document.createElement('div');
      profileSection.className = 'data-section';
      
      const profileTitle = document.createElement('h3');
      profileTitle.textContent = 'Profile Information';
      profileTitle.className = 'section-title';
      profileSection.appendChild(profileTitle);
      
      const profileTable = document.createElement('table');
      
      for (const [key, value] of Object.entries(data.ProfileInfo)) {
        // Skip image paths that are server file paths
        if (key === 'profile_image_path' && value.startsWith('/opt/')) continue;
        
        const row = profileTable.insertRow();
        
        const keyCell = row.insertCell();
        keyCell.textContent = formatKey(key);
        keyCell.className = 'key-cell';
        
        const valueCell = row.insertCell();
        
        // Handle special cases like URLs
        if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
          if (key.toLowerCase().includes('image') || key.toLowerCase().includes('banner')) {
            // It's an image URL
            const img = document.createElement('img');
            img.src = value;
            img.alt = key;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '150px';
            img.style.borderRadius = '4px';
            valueCell.appendChild(img);
          } else {
            // It's a regular URL
            const link = document.createElement('a');
            link.href = value;
            link.textContent = value;
            link.target = '_blank';
            valueCell.appendChild(link);
          }
        } else {
          // Regular value
          valueCell.textContent = value === null ? 'Not available' : value.toString();
        }
      }
      
      profileSection.appendChild(profileTable);
      resultsElement.appendChild(profileSection);
    }
    
    // Handle captions section if available
    if (data.captions && data.captions.length > 0) {
      const captionsSection = document.createElement('div');
      captionsSection.className = 'data-section';
      
      const captionsTitle = document.createElement('h3');
      captionsTitle.textContent = 'Recent Captions';
      captionsTitle.className = 'section-title';
      captionsSection.appendChild(captionsTitle);
      
      const captionsList = document.createElement('ul');
      captionsList.className = 'captions-list';
      
      // Only show up to 3 captions to save space
      const maxCaptions = Math.min(3, data.captions.length);
      
      for (let i = 0; i < maxCaptions; i++) {
        const caption = data.captions[i];
        if (caption.Caption && caption.Caption !== "No text available") {
          const item = document.createElement('li');
          item.textContent = caption.Caption;
          captionsList.appendChild(item);
        }
      }
      
      if (captionsList.children.length > 0) {
        captionsSection.appendChild(captionsList);
        resultsElement.appendChild(captionsSection);
      }
    }
    
    // Handle tweets section if available
    if (data.tweets && data.tweets.length > 0) {
      const tweetsSection = document.createElement('div');
      tweetsSection.className = 'data-section';
      
      const tweetsTitle = document.createElement('h3');
      tweetsTitle.textContent = 'Recent Tweets';
      tweetsTitle.className = 'section-title';
      tweetsSection.appendChild(tweetsTitle);
      
      // Only show up to 3 tweets to save space
      const maxTweets = Math.min(3, data.tweets.length);
      
      for (let i = 0; i < maxTweets; i++) {
        const tweet = data.tweets[i];
        if (tweet.text && tweet.text !== "No text available") {
          const tweetDiv = document.createElement('div');
          tweetDiv.className = 'tweet-item';
          
          // Tweet text
          const tweetText = document.createElement('p');
          tweetText.textContent = tweet.text;
          tweetDiv.appendChild(tweetText);
          
          // Tweet date
          if (tweet.created_at) {
            const tweetDate = document.createElement('div');
            tweetDate.className = 'tweet-date';
            tweetDate.textContent = formatDate(tweet.created_at);
            tweetDiv.appendChild(tweetDate);
          }
          
          // Tweet media (if any)
          if (tweet.media && tweet.media.length > 0) {
            const firstMedia = tweet.media[0];
            if (firstMedia.startsWith('http')) {
              const mediaThumb = document.createElement('img');
              mediaThumb.src = firstMedia;
              mediaThumb.className = 'tweet-media';
              mediaThumb.alt = 'Tweet media';
              mediaThumb.style.maxWidth = '100%';
              mediaThumb.style.maxHeight = '120px';
              mediaThumb.style.borderRadius = '4px';
              mediaThumb.style.marginTop = '8px';
              tweetDiv.appendChild(mediaThumb);
            }
          }
          
          tweetsSection.appendChild(tweetDiv);
        }
      }
      
      if (tweetsSection.childElementCount > 1) {  // > 1 because we already added the title
        resultsElement.appendChild(tweetsSection);
      }
    }
    
    // Add styles to the results
    addStylesToResults();
  }
  
  function formatKey(key) {
    // Convert camelCase to Title Case with spaces
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
  
  function formatDate(dateStr) {
    if (!dateStr) return 'Unknown date';
    
    try {
      // Example: "Mon Mar 03 15:55:15 +0000 2025"
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateStr; // Fallback to the original string
    }
  }
  
  function addStylesToResults() {
    const style = document.createElement('style');
    style.textContent = `
      .data-section {
        margin-bottom: 20px;
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      
      .section-title {
        margin: 0;
        padding: 12px 15px;
        background-color: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
        font-size: 16px;
        color: #333;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .key-cell {
        font-weight: bold;
        color: #555;
        width: 40%;
        padding: 8px 15px;
        border-bottom: 1px solid #e9ecef;
        vertical-align: top;
      }
      
      td {
        padding: 8px 15px;
        border-bottom: 1px solid #e9ecef;
      }
      
      tr:last-child td {
        border-bottom: none;
      }
      
      .captions-list {
        list-style-type: none;
        padding: 0 15px;
        margin: 10px 0;
      }
      
      .captions-list li {
        padding: 8px 0;
        border-bottom: 1px solid #e9ecef;
      }
      
      .captions-list li:last-child {
        border-bottom: none;
      }
      
      .tweet-item {
        padding: 12px 15px;
        border-bottom: 1px solid #e9ecef;
      }
      
      .tweet-item:last-child {
        border-bottom: none;
      }
      
      .tweet-item p {
        margin: 0 0 8px 0;
        line-height: 1.4;
      }
      
      .tweet-date {
        font-size: 12px;
        color: #6c757d;
      }
      
      .highlight-button {
        animation: pulse 1.5s infinite;
        background-color: #007bff;
      }
      
      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(0, 123, 255, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(0, 123, 255, 0);
        }
      }
    `;
    resultsElement.appendChild(style);
  }
});