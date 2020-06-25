<template>
<div style="width: max-content">
  <div class="connection-form">
    <label>Connection Name</label>
    <input v-model="$v.config_name.$model"
      :class="{invalid: $v.config_name.$error}" />

    <label>Host</label>
    <input v-model="$v.config_host.$model"
      :class="{invalid: $v.config_host.$error}" />

    <label class="optional">Port</label>
    <input v-model.number="$v.config_port.$model" placeholder="5656"
      :class="{invalid: $v.config_port.$error}" />

    <label>Username</label>
    <input v-model="$v.config_user.$model"
      :class="{invalid: $v.config_user.$error}" />

    <label>Passsword</label>
    <input v-model="$v.config_password.$model" type="password"
      :class="{invalid: $v.config_password.$error}" />

    <label class="optional">Default database</label>
    <input v-model="$v.config_defaultDatabase.$model" :placeholder="config_user"
      :class="{invalid: $v.config_defaultDatabase.$error}" />

    <label>Use SSH Tunnel</label>
    <input v-model="config_useSSH" type="checkbox" />

    <div class="ssh-form" v-if="config_useSSH">
      <label>Host</label>
      <input v-model="$v.config_ssh_host.$model"
        :class="{invalid: $v.config_ssh_host.$error}" />

      <label class="optional">Port</label>
      <input v-model.number="$v.config_ssh_port.$model" placeholder="22"
        :class="{invalid: $v.config_ssh_port.$error}" />

      <label>Username</label>
      <input v-model="$v.config_ssh_user.$model"
        :class="{invalid: $v.config_ssh_user.$error}" />

      <label>Authentication</label>
      <ui-select v-model="config_ssh_authType">
        <option value="password">Password</option>
        <option value="key">Private Key</option>
      </ui-select>

      <template v-if="config_ssh_authType === 'key'">
        <label>Private Key</label>
        <ui-file-picker v-model="$v.config_ssh_keyFile.$model"
          :class="{invalid: $v.config_ssh_keyFile.$error}" />

        <label class="optional">Passphrase</label>
        <input v-model="config_ssh_passphrase" type="password" />
      </template>
      <template v-else>
        <label>Password</label>
        <input v-model="$v.config_ssh_password.$model"
          :class="{invalid: $v.config_ssh_password.$error}" />
      </template>
    </div>
  </div>
  <div class="bottom-bar">
    <span v-if="saving" class="status-notice">Testing connection...</span>
    <div v-else-if="serverVersion" class="success-notice">
      Connection successful and config saved<br>
      <span class="status-notice">(Server version: {{ this.serverVersion }})</span>
    </div>
    <div v-else-if="failureMessage" class="failure-notice">
      Connection Failed<br>
      <span class="status-notice">{{ this.failureMessage }}</span>
    </div>
    <ui-button style="margin-left: 15px"
      :disabled="$v.$invalid || saving || !module.configModified" :loading="saving"
      @click="saveConfig">Save</ui-button>
  </div>
</div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Inject } from 'vue-property-decorator'
import { required, and, maxLength, alphaNum, integer, between, requiredIf, helpers } from 'vuelidate/lib/validators'

import UiButton from '@ui/Button.vue'
import UiSelect from '@ui/Select.vue'
import UiFilePicker from '@ui/FilePicker.vue'

const host = and(
  helpers.regex('host', /^[a-z\d]([a-z\d\-]{0,61}[a-z\d])?(\.[a-z\d]([a-z\d\-]{0,61}[a-z\d])?)*$/i),
  maxLength(255)
)

@Component({
  components: {
    UiButton,
    UiSelect,
    UiFilePicker,
  },
  computed: {
    ...([
      'name', 'host', 'port', 'user', 'password', 'defaultDatabase', 'useSSH',
      'ssh_host', 'ssh_port', 'ssh_user', 'ssh_authType', 'ssh_password', 'ssh_keyFile', 'ssh_passphrase',
    ].reduce((computed, field) => {
      computed['config_'+field] = {
        get() {
          return this.module.config[field]
        },
        set(val) {
          this.module.updateConfig({key: field, val})
        }
      }
      return computed
    }, {}))
  },
  validations() {
    return {
      config_name: {
        required,
      },
      config_host: {
        required,
        host,
      },
      config_port: {
        integer,
        between: between(1, 65535),
      },
      config_user: {
        required,
        alphaNum,
      },
      config_password: {
        required,
      },
      config_defaultDatabase: {
        alphaNum,
      },
      ...(this.config_useSSH ? {
          config_ssh_host: {
            required,
            host,
          },
          config_ssh_port: {
            integer,
            between: between(1, 65535),
          },
          config_ssh_user: {
            required,
            alphaNum,
          },
          config_ssh_password: {
            required: requiredIf(() => this.config_ssh_authType === 'password')
          },
          config_ssh_keyFile: {
            required: requiredIf(() => this.config_ssh_authType === 'key')
          },
        } : {}
      )
    }
  }
})
export default class ConnectionPage extends Vue {
  @Inject()
  readonly module!: any

  saving = false

  serverVersion = ''
  failureMessage = ''

  get config() {
    return this.module.config
  }

  saveConfig() {
    this.saving = true
    this.serverVersion = ''
    this.failureMessage = ''
    this.module.saveConnectionConfig()
      .then(serverVersion => {
        this.serverVersion = serverVersion
      })
      .catch(err => {
        this.failureMessage = err.message
      })
      .finally(() => this.saving = false)
  }
}
</script>

<style lang="stylus" scoped>
.connection-form, .ssh-form
  display: grid
  grid-template-columns: max-content 280px
  grid-gap: 8px 15px
  align-items: center

  label
    text-align: end

.ssh-form
  grid-column: 1 / -1
  background: rgba(255, 255, 255, 0.04)
  border-radius: 4px
  padding: 10px

.optional
  color: #ababab

.bottom-bar
  display: flex
  justify-content: flex-end
  align-items: center
  margin-top: 15px

.status-notice
  color: #ababab

.success-notice
  text-align: right
  color: #79bf28

.failure-notice
  text-align: right
  color: #e6535a
</style>
