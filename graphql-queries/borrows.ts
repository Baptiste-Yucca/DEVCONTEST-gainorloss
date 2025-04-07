import { gql } from 'graphql-request';

export const BORROWS_QUERY = gql`
  query GetBorrows($userAddress: String!) {
    borrows(
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
      borrowRate
      borrowRateMode
      timestamp
    }
  }
`; 