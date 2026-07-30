import axiosInstance from './axios.instance';

const productsService = {
  getProducts: async () => {
    const response = await axiosInstance.get('/api/v1/products');
    return response.data;
  },

  getPendingProducts: async () => {
    const response = await axiosInstance.get('/api/v1/products/pending');
    return response.data;
  },

  proposeProduct: async (productData) => {
    const response = await axiosInstance.post('/api/v1/products/create', productData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  approveProduct: async (id) => {
    const response = await axiosInstance.patch(`/api/v1/products/${id}/approve`);
    return response.data;
  },

  rejectProduct: async (id) => {
    const response = await axiosInstance.patch(`/api/v1/products/${id}/reject`);
    return response.data;
  },

  updateProductVisibility: async (id, visibilityData) => {
    const response = await axiosInstance.patch(`/api/v1/products/${id}/visibility`, visibilityData);
    return response.data;
  },
};

export default productsService;
