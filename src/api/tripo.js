const API_BASE = '/tripoapi/v2/openapi';

export class TripoAPI {
  /**
   * Upload an image file to Tripo3D to get a file token.
   * @param {string} apiKey - Tripo3D API Key
   * @param {File} file - Image file to upload
   * @returns {Promise<string>} The file token
   */
  static async uploadFile(apiKey, file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    if (json.code !== 0) {
      throw new Error(`Tripo3D API Error (${json.code}): ${json.message || 'Unknown error'}`);
    }

    // Tripo3D returns the token in data.image_token or data.file_token
    return json.data.image_token || json.data.file_token;
  }

  /**
   * Submit a Text-to-3D task to Tripo3D.
   * @param {string} apiKey - Tripo3D API Key
   * @param {string} prompt - Prompt description of the 3D model
   * @returns {Promise<string>} The task ID
   */
  static async createTextToModelTask(apiKey, prompt) {
    const response = await fetch(`${API_BASE}/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        type: 'text_to_model',
        prompt: prompt
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Task creation failed (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    if (json.code !== 0) {
      throw new Error(`Tripo3D API Error (${json.code}): ${json.message || 'Unknown error'}`);
    }

    return json.data.task_id;
  }

  /**
   * Submit an Image-to-3D task to Tripo3D.
   * @param {string} apiKey - Tripo3D API Key
   * @param {string} fileToken - Image file token from uploadFile
   * @param {string} fileType - Image extension (e.g. 'png', 'jpg')
   * @returns {Promise<string>} The task ID
   */
  static async createImageToModelTask(apiKey, fileToken, fileType = 'png') {
    const response = await fetch(`${API_BASE}/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        type: 'image_to_model',
        file: {
          type: fileType,
          file_token: fileToken
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Task creation failed (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    if (json.code !== 0) {
      throw new Error(`Tripo3D API Error (${json.code}): ${json.message || 'Unknown error'}`);
    }

    return json.data.task_id;
  }

  /**
   * Check status of a Tripo3D task.
   * @param {string} apiKey - Tripo3D API Key
   * @param {string} taskId - The task ID to query
   * @returns {Promise<Object>} The task data including status, progress, and result if success
   */
  static async checkTaskStatus(apiKey, taskId) {
    const response = await fetch(`${API_BASE}/task/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Task query failed (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    if (json.code !== 0) {
      throw new Error(`Tripo3D API Error (${json.code}): ${json.message || 'Unknown error'}`);
    }

    return json.data;
  }
}
