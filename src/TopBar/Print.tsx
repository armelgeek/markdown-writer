import {useSetState} from 'react-use'
import {useEffect, useRef} from 'react'
import {ElectronApi} from '@/utils/electronApi'
import {treeStore} from '@/store/tree'
import WebviewTag = Electron.WebviewTag
import {Button, CircularProgress} from '@mui/material'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import GetAppOutlinedIcon from '@mui/icons-material/GetAppOutlined';
import {download} from '@/utils/dom'
import {configStore} from '@/store/config'
export function TopBarPrint(props: {
  visible: boolean
  onClose: () => void
}) {
  const [state, setState] = useSetState({
    info: {preload: '', index: ''},
    url: '',
    loaded: false
  })
  const webview = useRef<WebviewTag>(null)
  useEffect(() => {
    ElectronApi.getInfo().then(res => {
      setState({
        info: res
      })
    })
  }, [])
  useEffect(() => {
    const finish = () => {
      setState({loaded: true})
    }
    webview.current!.addEventListener('did-finish-load', finish)
    return () => {
      webview.current?.removeEventListener('did-finish-load', finish)
    }
  }, [])

  useEffect(() => {
    if (props.visible) {
      setState({
        url: state.info.index + `#/render?path=${treeStore.activeNode!.path}&root=${treeStore.root?.path}`
      })
    }
  }, [props.visible, state.info.index])
  return (
    <div
      hidden={!props.visible}
      className={'fixed inset-0 z-50 bg-black/70'}
      onClick={() => {
        setState({url: '', loaded: false})
        props.onClose()
      }}
    >
      <div className={'w-[720px] mx-auto h-full relative'} onClick={(e) => e.stopPropagation()}>
        {!state.loaded &&
          <div className={'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute z-10 w-10'}>
            <CircularProgress color="secondary"/>
          </div>
        }
        <webview
          ref={webview}
          // preload={`file://${state.info.preload}`}
          // @ts-ignore
          nodeintegration={'true'}
          webpreferences={'contextIsolation=false'}
          style={{opacity: state.loaded ? 1 : 0}}
          className={'absolute left-0 top-8 h-[calc(100%_-_100px)] w-full'}
          src={state.url}
        />
        <div className={'left-1/2 bottom-5 -translate-x-1/2 absolute z-10 flex items-center space-x-5'}>
          <Button variant={'outlined'} size={'small'} startIcon={<CloseOutlinedIcon/>} onClick={() => {
            setState({url: '', loaded: false})
            props.onClose()
          }}>{configStore.getI18nText('close')}</Button>
          <Button
            variant={'contained'} size={'small'} startIcon={<GetAppOutlinedIcon/>}
            onClick={() => {
              ElectronApi.printPdf(webview.current!).then(res => {
                download(res, treeStore.activeNode!.name.replace(/\.\w+/, '.pdf'))
              })
            }}
          >{configStore.getI18nText('print')}</Button>
        </div>
      </div>
    </div>
  )
}
