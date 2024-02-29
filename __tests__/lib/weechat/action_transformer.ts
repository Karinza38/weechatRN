import { AnyAction, configureStore } from '@reduxjs/toolkit';
import { StoreState, reducer } from '../../../src/store';
import { transformToReduxAction } from '../../../src/lib/weechat/action_transformer';
import { ThunkAction } from 'redux-thunk';

describe('transformToReduxAction', () => {
  describe('on buffers', () => {
    it('removes references to buffers that have been closed', () => {
      const preloadedState = {
        hotlists: { '8578d9c00': {} as Hotlist, '83a41cd80': {} as Hotlist },
        nicklists: { '8578d9c00': [], '83a41cd80': [] },
        buffers: {
          '8578d9c00': {} as WeechatBuffer,
          '83a41cd80': {} as WeechatBuffer
        },
        lines: { '8578d9c00': [], '83a41cd80': [] },
        app: { currentBufferId: '8578d9c00', connected: true }
      };
      const store = configureStore({ reducer, preloadedState });

      const action = transformToReduxAction({
        id: 'buffers',
        header: { compression: 0, length: 0 },
        objects: [
          {
            type: 'hda',
            content: [{ pointers: ['83a41cd80'] }]
          }
        ]
      });
      expect(action).toBeDefined();

      store.dispatch(action!);

      expect(store.getState().buffers).not.toHaveProperty('8578d9c00');
      expect(store.getState().buffers).toHaveProperty('83a41cd80');

      expect(store.getState().hotlists).not.toHaveProperty('8578d9c00');
      expect(store.getState().hotlists).toHaveProperty('83a41cd80');

      expect(store.getState().nicklists).not.toHaveProperty('8578d9c00');
      expect(store.getState().nicklists).toHaveProperty('83a41cd80');

      expect(store.getState().lines).not.toHaveProperty('8578d9c00');
      expect(store.getState().lines).toHaveProperty('83a41cd80');

      expect(store.getState().app.currentBufferId).toBeNull();
    });

    it('first removes closed buffers, then updates buffers', () => {
      const action = transformToReduxAction({
        id: 'buffers',
        header: { compression: 0, length: 0 },
        objects: [
          {
            type: 'hda',
            content: []
          }
        ]
      });
      expect(action).toBeDefined();

      const thunk = action as ThunkAction<void, StoreState, void, AnyAction>;
      const dispatch = jest.fn();
      thunk(
        dispatch,
        jest.fn(() => ({ buffers: {} }) as StoreState)
      );
      expect(dispatch).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ type: 'FETCH_BUFFERS_REMOVED' })
      );
      expect(dispatch).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ type: 'FETCH_BUFFERS' })
      );
    });

    it('preserves currentBufferId if the buffer is still open', () => {
      const preloadedState = {
        buffers: {
          '8578d9c00': {} as WeechatBuffer,
          '83a41cd80': {} as WeechatBuffer
        },
        app: { currentBufferId: '8578d9c00', connected: true }
      };
      const store = configureStore({ reducer, preloadedState });

      const action = transformToReduxAction({
        id: 'buffers',
        header: { compression: 0, length: 0 },
        objects: [
          {
            type: 'hda',
            content: [{ pointers: ['8578d9c00'] }]
          }
        ]
      });
      expect(action).toBeDefined();

      store.dispatch(action!);

      expect(store.getState().app.currentBufferId).toEqual('8578d9c00');
    });
  });

  describe('on _buffer_closing', () => {
    it('removes references to buffers that have been closed', () => {
      const preloadedState = {
        hotlists: { '8578d9c00': {} as Hotlist, '83a41cd80': {} as Hotlist },
        nicklists: { '8578d9c00': [], '83a41cd80': [] },
        buffers: {
          '8578d9c00': {} as WeechatBuffer,
          '83a41cd80': {} as WeechatBuffer
        },
        lines: { '8578d9c00': [], '83a41cd80': [] },
        app: { currentBufferId: '83a41cd80', connected: true }
      };
      const store = configureStore({ reducer, preloadedState });

      const action = transformToReduxAction({
        id: '_buffer_closing',
        header: { compression: 0, length: 0 },
        objects: [
          {
            type: 'hda',
            content: [{ pointers: ['83a41cd80'] }]
          }
        ]
      });
      expect(action).toBeDefined();

      store.dispatch(action!);

      expect(store.getState().buffers).not.toHaveProperty('83a41cd80');
      expect(store.getState().buffers).toHaveProperty('8578d9c00');

      expect(store.getState().hotlists).not.toHaveProperty('83a41cd80');
      expect(store.getState().hotlists).toHaveProperty('8578d9c00');

      expect(store.getState().nicklists).not.toHaveProperty('83a41cd80');
      expect(store.getState().nicklists).toHaveProperty('8578d9c00');

      expect(store.getState().lines).not.toHaveProperty('83a41cd80');
      expect(store.getState().lines).toHaveProperty('8578d9c00');

      expect(store.getState().app.currentBufferId).toBeNull();
    });

    it('preserves currentBufferId if the buffer is still open', () => {
      const preloadedState = {
        buffers: {
          '8578d9c00': {} as WeechatBuffer,
          '83a41cd80': {} as WeechatBuffer
        },
        lines: { '8578d9c00': [], '83a41cd80': [] },
        app: { currentBufferId: '83a41cd80', connected: true }
      };
      const store = configureStore({ reducer, preloadedState });

      const action = transformToReduxAction({
        id: '_buffer_closing',
        header: { compression: 0, length: 0 },
        objects: [
          {
            type: 'hda',
            content: [{ pointers: ['8578d9c00'] }]
          }
        ]
      });
      expect(action).toBeDefined();

      store.dispatch(action!);

      expect(store.getState().app.currentBufferId).toEqual('83a41cd80');
    });
  });

  describe('on last_read_lines', () => {
    it('merges the last read line with buffer state', () => {
      const preloadedState = {
        buffers: {
          '83d204d80': { full_name: 'irc.libera.#weechat' } as WeechatBuffer
        }
      };
      const store = configureStore({ reducer, preloadedState });

      const action = transformToReduxAction({
        id: 'last_read_lines',
        header: { compression: 0, length: 0 },
        objects: [
          {
            type: 'hda',
            content: [
              {
                buffer: '83d204d80',
                pointers: ['83d204d80', '83c016280', '838a65900', '83c000420']
              }
            ]
          }
        ]
      });
      expect(action).toBeDefined();

      store.dispatch(action!);

      expect(store.getState().buffers).toMatchObject({
        '83d204d80': {
          full_name: 'irc.libera.#weechat',
          last_read_line: '83c000420'
        }
      });
    });
  });
});
