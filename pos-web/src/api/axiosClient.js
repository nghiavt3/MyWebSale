import axios from 'axios';

const axiosClient = axios.create({
    baseURL: process.env.REACT_APP_API_URL, // Tất cả các yêu cầu sẽ tự động bắt đầu bằng IP này
    headers: {
        'Content-Type': 'application/json',
    },
});

export default axiosClient;