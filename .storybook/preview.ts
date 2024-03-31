import type { Preview } from '@storybook/react'

import "../src/routes/styles.css"
import "../src/routes/semantic.css"

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'catppuccin latte',
      values: [
        {
          name: 'catppuccin latte',
          value: '#ccd0da',
        },
        {
          name: 'catppuccin macchiato',
          value: '#363a4f',
        },
      ],
    },
  },
};

export default preview;
