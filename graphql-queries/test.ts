import { gql } from 'graphql-request';

export const TEST_QUERY = gql`
  query {
    _meta {
      block {
        number
      }
      deployment
    }
  }
`; 