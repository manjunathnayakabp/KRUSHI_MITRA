import axios from 'axios';

// Matches the exact port uvicorn runs on
const API_URL = 'http://127.0.0.1:8000'; 

export const submitNodeData = async (formData) => {
    try {
        const response = await axios.post(`${API_URL}/submit-node-data/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        console.error("Error submitting data:", error);
        throw error;
    }
};

// Add this to the bottom of frontend/src/lib/api.js

export const getChartData = async (nodeId) => {
    try {
        const response = await axios.get(`${API_URL}/api/chart-data/${nodeId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching chart data:", error);
        return [];
    }
};

export const registerFarmer = async (userData) => {
    try {
        const response = await axios.post(`${API_URL}/api/register`, userData);
        return response.data;
    } catch (error) {
        console.error("Registration error:", error);
        return { error: "Failed to connect to server." };
    }
};

export const loginFarmer = async (credentials) => {
    try {
        const response = await axios.post(`${API_URL}/api/login`, credentials);
        return response.data;
    } catch (error) {
        console.error("Login error:", error);
        return { error: "Failed to connect to server." };
    }
};

export const startCropCycle = async (data) => {
    try {
        const response = await axios.post(`${API_URL}/api/lifecycle`, data);
        return response.data;
    } catch (error) {
        console.error("Lifecycle error:", error);
        return { error: "Failed to start crop cycle." };
    }
};

export const getAllCropCycles = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/lifecycle/all`);
        return response.data;
    } catch (error) {
        return [];
    }
};

export const getCommunityPosts = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/community`);
        return response.data;
    } catch (error) {
        console.error("Community fetch error:", error);
        return [];
    }
};

export const createCommunityPost = async (postData) => {
    try {
        const response = await axios.post(`${API_URL}/api/community`, postData);
        return response.data;
    } catch (error) {
        return { error: "Failed to post." };
    }
};
