import { BaseConnector, Callbacks } from '@duet3d/connectors'

import eventbus from '@/utils/eventbus'
import Events from '@/utils/events'
import { closeNotifications } from '@/utils/notifications'
import { useRootStore } from '.'
import { useMachinesStore } from './machines'

export default class MachineCallbacks implements Callbacks {
  /**
   * Hostname of the connected machine
   */
  private hostname: string

  /**
   * Constructor of this class
   * @param hostname Hostname of the connected machine
   * @param commit Global Vuex commit method
   * @param dispatch Global Vuex dispatch method
   */
  constructor(hostname: string) {
    this.hostname = hostname
  }

  /**
   * Called to report the progress while establishing a connection
   * @param connector Connector instance
   * @param progress Connection progress in percent (0..100) or -1 when the connect process has finished
   * @returns
   */
  onConnectProgress(connector: BaseConnector, progress: number) {
    useRootStore().connectingProgress = progress
  }

  /**
   * Connection has been lost
   * The callee may attempt to reconnect in given intervals by calling connector.reconnect()
   * @param connector Connector instance
   * @param reason Reason for the connection loss
   */
  async onConnectionError(connector: BaseConnector, reason: unknown) {
    await useMachinesStore().onConnectionError(reason as Error)
  }

  /**
   * Connector has established a connection again
   * @param connector Connector instance
   */
  onReconnected(connector: BaseConnector) {
    closeNotifications(true)
  }

  /***
   * Object model update has been received
   * The received data can be patched into the object model instance via omInstance.update(data)
   * Note that this is called before the final connector instance is returned!
   */
  onUpdate(connector: BaseConnector, data: any) {
    useMachinesStore().update(data)
  }

  /**
   * Files or directories have been changed on the given volume
   * @param connector Connector instance
   * @param volumeIndex Index of the volume where files or directories have been changed
   */
  onVolumeChanged(connector: BaseConnector, volumeIndex: number) {
    eventbus.$emit(Events.filesOrDirectoriesChanged, {
      machine: this.hostname,
      volume: volumeIndex,
    })
  }
}
