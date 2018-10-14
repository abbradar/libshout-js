/* eslint-disable no-param-reassign */
const c = require('./bindings')
const weak = require('weak-napi')
const Writable = require('stream').Writable
const util = require('util')
const {
	ERRORS, PROTOCOLS, FORMATS, AUDIOINFO, META, TLS,
} = require('./constants')

c.shout_send.promise = util.promisify(c.shout_send.async)
c.shout_send_raw.promise = util.promisify(c.shout_send_raw.async)
c.shout_open.promise = util.promisify(c.shout_open.async)
c.shout_close.promise = util.promisify(c.shout_close.async)

const handleErrors = (code) => {
	if (code < 0) {
		throw new Error(ERRORS[code])
	}
	return code
}

const handleVoidErrors = (code) => {
	handleErrors(code)
}

const setSingleOrMulti = (pointer, keyOrObject, value, func) => {
	if (typeof keyOrObject === 'string') {
		handleErrors(func(pointer, keyOrObject, value))
	} else {
		Object.entries(keyOrObject).forEach(kv => {
			handleErrors(func(pointer, kv[0], kv[1]))
		})
	}
}

const getVersion = () => {
	return c.shout_version(null, null, null)
}

class Metadata {
	constructor() {
		this.pointer = c.shout_metadata_new()
		if (this.pointer === null) {
			throw new Error("Could not allocate shout_metadata_t")
		}
		weak(this, () => {
			c.shout_metadata_free(this.pointer)
		})
	}

	add(keyOrObject, value) {
		setSingleOrMulti(this.pointer, keyOrObject, value, c.shout_metadata_add)
	}
}

class Shout {
	constructor() {
		c.shout_init()
		this.pointer = c.shout_new()
		if (this.pointer === null) {
			throw new Error("Could not allocate shout_t")
		}
		weak(this, () => {
			c.shout_free(this.pointer)
		})
		const ls = this
		this.writeStream = new Writable({
			write(data, encoding, cb) {
				ls.send(data).then(() => ls.sync()).then(() => cb(null)).catch(cb)
			},
		})
	}

	/* ----- Managing Connections ----- */
	open() {
		return c.shout_open.promise(this.pointer).then(handleVoidErrors)
	}

	close() {
		return c.shout_close.promise(this.pointer).then(handleVoidErrors)
	}

	getConnected() {
		return ERRORS[(c.shout_get_connected(this.pointer))]
	}

	getError() {
		return c.shout_get_error(this.pointer)
	}

	getErrno() {
		return c.shout_get_errno(this.pointer)
	}

	/* ----- Sending Data ----- */
	send(data) {
		return c.shout_send.promise(this.pointer, data, data.length).then(handleVoidErrors)
	}

	sendRaw(data) {
		return c.shout_send_raw.promise(this.pointer, data, data.length).then(handleVoidErrors)
	}

	sync() {
		const delay = this.getDelay()
		return new Promise((resolve) => setTimeout(resolve, delay))
	}

	getDelay() {
		return c.shout_delay(this.pointer)
	}

	getQueueLen() {
		return c.shout_queuelen(this.pointer)
	}

	/* ----- Connection Parameters ----- */
	setHost(host) {
		handleErrors(c.shout_set_host(this.pointer, host))
	}

	getHost() {
		return c.shout_get_host(this.pointer)
	}

	setPort(port) {
		handleErrors(c.shout_set_port(this.pointer, port))
	}

	getPort() {
		return c.shout_get_port(this.pointer)
	}

	setUser(user) {
		handleErrors(c.shout_set_user(this.pointer, user))
	}

	getUser() {
		return c.shout_get_user(this.pointer)
	}

	setPassword(pass) {
		handleErrors(c.shout_set_password(this.pointer, pass))
	}

	getPassword() {
		return c.shout_get_password(this.pointer)
	}

	// Protocol constants
	setProtocol(protocol) {
		if (typeof protocol === 'string') {
			protocol = PROTOCOLS[protocol]
		}
		handleErrors(c.shout_set_protocol(this.pointer, protocol))
	}

	getProtocol() {
		return PROTOCOLS[c.shout_get_protocol(this.pointer)]
	}

	// Format constants
	setFormat(format) {
		if (typeof format === 'string') {
			format = FORMATS[format]
		}
		handleErrors(c.shout_set_format(this.pointer, format))
	}

	getFormat() {
		return FORMATS[c.shout_get_format(this.pointer)]
	}

	setMount(mountPoint) {
		handleErrors(c.shout_set_mount(this.pointer, mountPoint))
	}

	getMount() {
		return c.shout_get_mount(this.pointer)
	}

	setDumpfile(dumpfile) {
		handleErrors(c.shout_set_dumpfile(this.pointer, dumpfile))
	}

	getDumpfile() {
		return c.shout_get_dumpfile(this.pointer)
	}

	setAgent(agent) {
		handleErrors(c.shout_set_agent(this.pointer, agent))
	}

	getAgent() {
		return c.shout_get_agent(this.pointer)
	}

	// TLS Constants
	setTls(mode) {
		if (typeof mode === 'string') {
			mode = TLS[mode]
		}
		handleErrors(c.shout_set_tls(this.pointer, mode))
	}

	getTls() {
		return TLS[c.shout_get_tls(this.pointer)]
	}

	setCaDirectory(directory) {
		handleErrors(c.shout_set_ca_directory(this.pointer, directory))
	}

	getCaDirectory() {
		return c.shout_get_ca_directory(this.pointer)
	}

	setCaFile(file) {
		handleErrors(c.shout_set_ca_file(this.pointer, file))
	}

	getCaFile() {
		return c.shout_get_ca_file(this.pointer)
	}

	setCiphers(ciphers) {
		handleErrors(c.shout_set_allowed_ciphers(this.pointer, ciphers))
	}

	getCiphers() {
		return c.shout_get_allowed_ciphers(this.pointer)
	}

	setClientCert(certificate) {
		handleErrors(c.shout_set_client_certificate(this.pointer, certificate))
	}

	getClientCert() {
		return c.shout_get_client_certificate(this.pointer)
	}

	/* ----- Directory Parameters ----- */
	setPublic(makepublic) {
		handleErrors(c.shout_set_public(this.pointer, +makepublic))
	}

	getPublic() {
		return !!c.shout_get_public(this.pointer)
	}

	// Metadata for the STREAM, not for the track.
	// These get sent as headers prefaced with "icy-", and can be any string, not just those
	// defined in META.
	setMeta(name, value) {
		handleErrors(c.shout_set_meta(this.pointer, name, value))
	}

	getMeta(name) {
		return c.shout_get_meta(this.pointer, name)
	}

	// Audio constants
	setAudioInfo(name, value) {
		setSingleOrMulti(this.pointer, name, value, c.shout_set_audio_info)
	}

	getAudioInfo(name) {
		return AUDIOINFO[c.shout_get_audio_info(this.pointer, name)]
	}

	// Metadata for the TRACK, not for the stream
	setMetadata(metadata) {
		handleErrors(c.shout_set_metadata(this.pointer, metadata.pointer))
	}
}

module.exports = {
	PROTOCOLS,
	FORMATS,
	META,
	AUDIOINFO,
	ERRORS,
	getVersion,
	Metadata,
	Shout,
}
