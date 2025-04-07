import { gql } from 'graphql-request';

export const WITHDRAWS_QUERY = gql`
  query GetWithdraws($userAddress: String!) {
    withdraws(
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