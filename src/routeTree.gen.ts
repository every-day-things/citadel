/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as AuthorsImport } from './routes/authors'
import { Route as IndexImport } from './routes/index'
import { Route as BooksBookIdImport } from './routes/books.$bookId'

// Create/Update Routes

const AuthorsRoute = AuthorsImport.update({
  path: '/authors',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const BooksBookIdRoute = BooksBookIdImport.update({
  path: '/books/$bookId',
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/authors': {
      preLoaderRoute: typeof AuthorsImport
      parentRoute: typeof rootRoute
    }
    '/books/$bookId': {
      preLoaderRoute: typeof BooksBookIdImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren([
  IndexRoute,
  AuthorsRoute,
  BooksBookIdRoute,
])

/* prettier-ignore-end */
