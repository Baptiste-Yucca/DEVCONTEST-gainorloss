import { gql } from 'graphql-request';

export const REPAYS_QUERY = gql`
  query GetRepays($userAddress: String!) {
    repays(
      first: 1000, 
      where: { user_: { id: $userAddress } }, 
      orderBy: timestamp, 
      orderDirection: desc
    ) {
      id
      txHash
      user {
        id
      }
      reserve {
        id
      }
      amount
      timestamp
    }
  }
`; 