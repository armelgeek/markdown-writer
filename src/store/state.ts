import {makeAutoObservable, observable, runInAction} from 'mobx'
import {Subject} from 'rxjs'
import {editor} from 'monaco-editor'
import IStandaloneCodeEditor = editor.IStandaloneCodeEditor
import Token from 'markdown-it/lib/token'
import {getClipboardFile} from '@/utils/dom'
import {ElectronApi} from '@/utils/electronApi'
import {TreeNode, treeStore} from '@/store/tree'
import {extname, join, basename, dirname, sep} from 'path'
import {writeFile, copyFile} from 'fs/promises'
import {message} from '@/components/message'
import {EditorUtils} from '@/Editor/method'
import {mediaType} from '@/utils/mediaType'
import {configStore} from '@/store/config'
export class StateStore {
  openSearch = false
  moveToLine$ = new Subject<number>()
  revertText$ = new Subject<string>()
  changeText$ = new Subject<{path: string, text: string}>()
  editor$ = new Subject<IStandaloneCodeEditor>()
  renderNow$ = new Subject<string>()
  topTokens: Token[] = []
  currentCode = ''
  editor?:IStandaloneCodeEditor
  editorFocused = false
  treeOpen = true
  recentRecordVisible = false
  viewState:'column' | 'code' | 'view' = 'column'
  viewWidth = Number(localStorage.getItem('viewWidth')) || 600
  finderVisible = false
  printVisible = false
  configVisible = false
  historyVisible = false
  setStatusVisible(key: 'treeOpen' | 'recentRecordVisible' | 'openSearch' | 'finderVisible' | 'printVisible' | 'configVisible' | 'historyVisible', value: boolean) {
    this[key] = value
  }

  setTopTokens(tokens: Token[]) {
    this.topTokens = tokens
  }

  get showSubNav() {
    return this.viewWidth > 1000 || (this.viewState === 'view' && document.body.clientWidth > 1200)
  }

  get headingTokens() {
    return this.topTokens.filter(t => t.type === 'heading_open')
  }

  setViewState(state: typeof this.viewState) {
    this.viewState = state
  }

  constructor() {
    makeAutoObservable(this, {
      currentCode: false
    })
    window.addEventListener('paste', (e) => {
      const ev = e as ClipboardEvent
      const file = getClipboardFile(ev)
      if (file) {
        ev.preventDefault()
        this.insertFile(file)
      }
    })
  }
  insertFile(file: File) {
    if (!treeStore.root) return
    const node = treeStore.selectedNode ? treeStore.selectedNode.type === 'folder' ? treeStore.selectedNode : treeStore.nodeMap.get(treeStore.selectedNode.parentPath)! : treeStore.root!
    ElectronApi.openDialog('showSaveDialog', {
      title: configStore.getI18nText('state.saveFileTitle'),
      properties: ['showOverwriteConfirmation'],
      defaultPath: node.path
    }).then(async ({filePath}) => {
      if (filePath) {
        if (!filePath.startsWith(treeStore.root!.path)) {
          return message(configStore.getI18nText('state.outsideProject'), {type: 'waring'})
        }
        let name = basename(filePath)
        if (!/\.\w+$/.test(name)) {
          name += extname(file.name)
        }
        const savePath = join(dirname(filePath), name)
        const mt = mediaType(file.name)
        if (!file.path && mt === 'image') {
          const buffer = await file.arrayBuffer()
          await writeFile(savePath, new Uint8Array(buffer), {encoding: 'utf-8'})
        } else if (file.path) {
          await copyFile(file.path, savePath)
        } else {
          return
        }
        runInAction(()  => {
          const addNode:TreeNode = observable({
            path: savePath,
            name: name,
            type: 'file',
            parentPath: node.path
          })
          node.children = treeStore.sort([...node.children!, addNode])
          treeStore.nodeMap.set(addNode.path, addNode)
          if (this.editorFocused) {
            EditorUtils.insertText(
              this.editor!,
              `${['image', 'audio', 'video'].includes(mt) ? '!' : ''}[${basename(filePath)}](${addNode.path.replace(treeStore.root!.path, '').replaceAll(sep, '/')})`
            )
          }
        })
      }
    })
  }
}

export const stateStore = new StateStore()
