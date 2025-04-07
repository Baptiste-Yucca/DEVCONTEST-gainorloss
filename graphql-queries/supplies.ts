import { gql } from 'graphql-request';

export const SUPPLIES_QUERY = gql`
  query GetSupplies($userAddress: String!) {
    supplies(
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