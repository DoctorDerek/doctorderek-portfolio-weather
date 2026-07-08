import Document, { Head, Html, Main, NextScript } from "next/document"

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" className="h-full w-full">
        <Head>
          <meta charSet="utf-8" />
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/favicon-io/apple-touch-icon.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="/favicon-io/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="/favicon-io/favicon-16x16.png"
          />
          <meta name="theme-color" content="#FFFFFF" />
          <link rel="manifest" href="/favicon-io/site.webmanifest" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,600,700&display=optional"
          />
          <noscript>You need to enable JavaScript to run this app.</noscript>
        </Head>

        <body className="h-full w-full subpixel-antialiased">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
