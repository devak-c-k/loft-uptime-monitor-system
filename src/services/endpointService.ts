import axios from 'axios';

export interface Endpoint {
  id: string;
  name: string;
  url: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEndpointDTO {
  name: string;
  url: string;
  type?: string;
}

export interface UpdateEndpointDTO {
  name?: string;
  url?: string;
  type?: string;
}

class EndpointService {
  private baseURL = '/api/endpoints';

  async getAllEndpoints(): Promise<Endpoint[]> {
    const response = await axios.get(this.baseURL);
    return response.data.endpoints || [];
  }

  async getEndpointById(id: string): Promise<Endpoint> {
    const response = await axios.get(`${this.baseURL}/${id}`);
    return response.data.endpoint;
  }

  async createEndpoint(data: CreateEndpointDTO): Promise<Endpoint> {
    const response = await axios.post(this.baseURL, data);
    return response.data.endpoint;
  }

  async updateEndpoint(id: string, data: UpdateEndpointDTO): Promise<Endpoint> {
    const response = await axios.patch(`${this.baseURL}/${id}`, data);
    return response.data.endpoint;
  }

  async deleteEndpoint(id: string): Promise<void> {
    await axios.delete(`${this.baseURL}/${id}`);
  }
}

export const endpointService = new EndpointService();
