import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
//import { router } from 'expo-router'; // We use expo-router to handle automatic logouts

const BASE_URL = process.env.EXPO_PUBLIC_API_URL; 

// 1. In-Memory Token Storage
let inMemoryAccessToken: string | null = null;

export const setInMemoryToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

// --- CRITICAL FIX: Refresh Lock Queue ---
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Request Interceptor
apiClient.interceptors.request.use(async (config) => {
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});

// 3. Response Interceptor
apiClient.interceptors.response.use(
  (response) => response, 
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // If a refresh is already happening, pause this request and put it in the queue
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true; 
      isRefreshing = true; // Lock the interceptor

      try {
          const refreshToken = await SecureStore.getItemAsync('refresh_token');

          if (!refreshToken) {
            await SecureStore.deleteItemAsync('access_token');
            await SecureStore.deleteItemAsync('refresh_token');

            setInMemoryToken(null);

            return Promise.reject(error);
          }

          const refreshResponse = await axios.post(
            `${BASE_URL}/accounts/token/refresh/`,
            {
              refresh: refreshToken
            }
          );

          const newAccessToken = refreshResponse.data.access;

          await SecureStore.setItemAsync('access_token', newAccessToken);
          setInMemoryToken(newAccessToken);

          processQueue(null, newAccessToken);

          originalRequest.headers.Authorization =
            `Bearer ${newAccessToken}`;

          return apiClient(originalRequest);
        } catch (refreshError) {
        processQueue(refreshError, null);

        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        setInMemoryToken(null);

        // 3. This now uses the imperative router, which never loses context
       // router.replace('/accounts/login');
        return Promise.reject(refreshError);
      } finally {
        // Always unlock when done
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;