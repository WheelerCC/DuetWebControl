/**
 * DO NOT MODIFY THIS FILE! IT IS AUTO-GENERATED ON COMPILATION!
*/
import { initCollection } from '@duet3d/objectmodel';
import DwcPlugin from './DwcPlugin';

export default initCollection(DwcPlugin, [
	{
        id: 'ObjectModelBrowser',
        name: 'Object Model Browser',
        author: 'Duet3D Ltd',
        version: '3.6.1',
        loadDwcResources: () => import(
            /* webpackChunkName: "ObjectModelBrowser" */
            "./ObjectModelBrowser/index"
        )
    },
	{
        id: 'OnScreenKeyboard',
        name: 'On-Screen Keyboard',
        author: 'Duet3D Ltd',
        version: '3.6.1',
        loadDwcResources: () => import(
            /* webpackChunkName: "OnScreenKeyboard" */
            "./OnScreenKeyboard/index"
        )
    },
]);
