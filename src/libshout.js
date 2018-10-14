/* eslint-disable no-param-reassign */
const c = require('./bindings')
const weak = require('weak-napi')
const Writable = require('stream').Writable
const {
	ERRORS, PROTOCOLS, FORMATS, AUDIOINFO, META, TLS,
} = require('./constants')

const handleErrors = (code) => {
	if (code < 0) {
		throw new Error(ERRORS[code])
	}
	return code
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
				ls.send(data)
				const delay = ls.getDelay()
				setTimeout(() => cb(), delay)
			},
		})
	}

	/* ----- Managing Connections ----- */
	open() {
		return handleErrors(c.shout_open(this.pointer))
	}

	close() {
		return handleErrors(c.shout_close(this.pointer))
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
		return handleErrors(c.shout_send(this.pointer, data, data.length))
	}

	sendRaw(data) {
		return handleErrors(c.shout_send_raw(this.pointer, data, data.length))
	}

	sync() {
		c.shout_sync(this.pointer)
	}

	getDelay() {
		return c.shout_delay(this.pointer)
	}

	getQueueLen() {
		return c.shout_queuelen(this.pointer)
	}

	/* ----- Connection Parameters ----- */
	setNonblocking(nonblocking) {
		return handleErrors(c.shout_set_nonblocking(this.pointer, nonblocking))
	}

	getNonblocking() {
		return c.shout_get_nonblocking(this.pointer)
	}

	setHost(host) {
		return handleErrors(c.shout_set_host(this.pointer, host))
	}

	getHost() {
		return c.shout_get_host(this.pointer)
	}

	setPort(port) {
		return handleErrors(c.shout_set_port(this.pointer, port))
	}

	getPort() {
		return c.shout_get_port(this.pointer)
	}

	setUser(user) {
		return handleErrors(c.shout_set_user(this.pointer, user))
	}

	getUser() {
		return c.shout_get_user(this.pointer)
	}

	setPassword(pass) {
		return handleErrors(c.shout_set_password(this.pointer, pass))
	}

	getPassword() {
		return c.shout_get_password(this.pointer)
	}

	// Protocol constants
	setProtocol(protocol) {
		if (typeof protocol === 'string') {
			protocol = PROTOCOLS[protocol]
		}
		return handleErrors(c.shout_set_protocol(this.pointer, protocol))
	}

	getProtocol() {
		return PROTOCOLS[c.shout_get_protocol(this.pointer)]
	}

	// Format constants
	setFormat(format) {
		if (typeof format === 'string') {
			format = FORMATS[format]
		}
		return handleErrors(c.shout_set_format(this.pointer, format))
	}

	getFormat() {
		return FORMATS[c.shout_get_format(this.pointer)]
	}

	setMount(mountPoint) {
		return handleErrors(c.shout_set_mount(this.pointer, mountPoint))
	}

	getMount() {
		return c.shout_get_mount(this.pointer)
	}

	setDumpfile(dumpfile) {
		return handleErrors(c.shout_set_dumpfile(this.pointer, dumpfile))
	}

	getDumpfile() {
		return c.shout_get_dumpfile(this.pointer)
	}

	setAgent(agent) {
		return handleErrors(c.shout_set_agent(this.pointer, agent))
	}

	getAgent() {
		return c.shout_get_agent(this.pointer)
	}

	// TLS Constants
	setTls(mode) {
		if (typeof mode === 'string') {
			mode = TLS[mode]
		}
		return handleErrors(c.shout_set_tls(this.pointer, mode))
	}

	getTls() {
		return TLS[c.shout_get_tls(this.pointer)]
	}

	setCaDirectory(directory) {
		return handleErrors(c.shout_set_ca_directory(this.pointer, directory))
	}

	getCaDirectory() {
		return c.shout_get_ca_directory(this.pointer)
	}

	setCaFile(file) {
		return handleErrors(c.shout_set_ca_file(this.pointer, file))
	}

	getCaFile() {
		return c.shout_get_ca_file(this.pointer)
	}

	setCiphers(ciphers) {
		return handleErrors(c.shout_set_allowed_ciphers(this.pointer, ciphers))
	}

	getCiphers() {
		return c.shout_get_allowed_ciphers(this.pointer)
	}

	setClientCert(certificate) {
		return handleErrors(c.shout_set_client_certificate(this.pointer, certificate))
	}

	getClientCert() {
		return c.shout_get_client_certificate(this.pointer)
	}

	/* ----- Directory Parameters ----- */
	setPublic(makepublic) {
		return handleErrors(c.shout_set_public(this.pointer, +makepublic))
	}

	getPublic() {
		return !!c.shout_get_public(this.pointer)
	}

	// Metadata for the STREAM, not for the track.
	// These get sent as headers prefaced with "icy-", and can be any string, not just those
	// defined in META.
	setMeta(name, value) {
		return handleErrors(c.shout_set_meta(this.pointer, name, value))
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
