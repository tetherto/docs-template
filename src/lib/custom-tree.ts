import type { Node } from 'fumadocs-core/page-tree';
import { resolveIcon } from "@/lib/resolveIcon";
import React from "react";


// Custom tree structure that replicates the GitBook SUMMARY.md structure
export const customTree: Node[] = [
  {
    name: 'Home',
    url: '/',
    type: 'page',
    icon: resolveIcon('Map'),
  },
  {
    name: 'About',
    type: 'folder',
    icon: resolveIcon('Rocket'),
    children: [
      {
        name: 'About',
        url: '/about/about',
        type: 'page',
      },
    ]
  },
  {
  type: "separator",
  name: "BUILD",
  },
  {
    name: 'Getting Started',
    type: 'folder',
    icon: resolveIcon('Rocket'),
    children: [
      {
        name: 'Quickstart',
        url: '/getting-started/quickstart',
        type: 'page',
      },
    ]
  },
  {
    name: 'How-tos',
    type: 'folder',
    icon: resolveIcon('Cog'),
    children: [
      { name: 'How-to', url: '/how-tos/how-to', type: 'page', icon: resolveIcon('Router') },
    ],
  },
  {
    name: 'Tutorials',
    type: 'folder',
    icon: resolveIcon('BookType'),
    children: [
      {
        name: 'Tutorials',
        url: '/tutorials/tutorials',
        type: 'page',
        icon: resolveIcon('Rocket'),
      },
    ]
  },
  {
    type: "separator",
    name: "REFERENCES",
  },
  {
    name: 'References',
    type: 'folder',
    icon: resolveIcon('BookA'),
    children: [
      { name: 'References', url: '/references/references', type: 'page' },
    ],
  },
  {
    type: "separator",
    name: "HELP",
  },
  
  {
    name: 'FAQs',
    type: 'folder',
    icon: resolveIcon('MessageCircleQuestionMark'),
    children: [
      { name: 'FAQs', url: '/faqs/faqs', type: 'page' },
    ],
  },
];
