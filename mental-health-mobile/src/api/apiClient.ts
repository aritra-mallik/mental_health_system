import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL; 

// 1. In-Memory Token Storage (Fast!)
let inMemoryAccessToken: string | null = null;

export const setInMemoryToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Request Interceptor: Read from memory, not hardware
apiClient.interceptors.request.use(async (config) => {
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});

// 3. Response Interceptor: The Auto-Refresh Engine
apiClient.interceptors.response.use(
  (response) => response, // If the request succeeds, just pass it through
  async (error) => {
    const originalRequest = error.config;

    // If we get a 401 Unauthorized and we haven't already tried to retry this request...
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; 

      try {
        // Grab the refresh token from the vault
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        
        if (refreshToken) {
          // Ask Django for a new access token
          const refreshResponse = await axios.post(`${BASE_URL}/accounts/token/refresh/`, {
            refresh: refreshToken
          });

          const newAccessToken = refreshResponse.data.access;

          // Save the new token in the vault AND in memory
          await SecureStore.setItemAsync('access_token', newAccessToken);
          setInMemoryToken(newAccessToken);

          // Update the failed request with the new token and try again!
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // If the refresh token is ALSO expired, they must log in again.
        // Your AuthContext will handle this gracefully.
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;