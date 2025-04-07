import { NextApiRequest, NextApiResponse } from 'next';
import { GraphQLClient } from 'graphql-request';
import { TEST_QUERY } from '@/graphql-queries/test';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Utilisation directe de l'URL de l'API sans authentification
    const GRAPH_URL = process.env.NEXT_PUBLIC_THEGRAPH_API_URL || '';
    const graphqlClient = new GraphQLClient(GRAPH_URL);
    const data = await graphqlClient.request(TEST_QUERY);
    
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error testing GraphQL:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
} 