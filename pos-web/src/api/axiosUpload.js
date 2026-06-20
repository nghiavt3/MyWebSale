// axiosUpload.js
import axios from 'axios';

const axiosUpload = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    // KHÔNG định nghĩa 'Content-Type' ở đây
    headers: {
        'Accept': 'application/json',
    },
});

export default axiosUpload;