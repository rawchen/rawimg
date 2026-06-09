package com.rawchen.entity;

import lombok.Data;

import java.io.Serializable;

/**
 * 统一响应结果类
 * @author RawChen
 * @date 2023-11-22 13:38
 */
@Data
public class R<T> implements Serializable {

    /**
     * 状态码：0表示成功，其他表示失败
     */
    private Integer code;

    /**
     * 消息
     */
    private String msg;

    /**
     * 数据
     */
    private T data;

    public R(Integer code, String msg) {
        this.code = code;
        this.msg = msg;
        this.data = null;
    }

    public R(Integer code, String msg, T data) {
        this.code = code;
        this.msg = msg;
        this.data = data;
    }

    // ============== 成功响应 ==============

    /**
     * 成功响应，无数据
     */
    public static R<Void> ok() {
        return new R<>(0, "ok");
    }

    /**
     * 成功响应，带数据
     */
    public static <T> R<T> ok(T data) {
        return new R<>(0, "ok", data);
    }

    /**
     * 成功响应，带消息和数据
     */
    public static <T> R<T> ok(String msg, T data) {
        return new R<>(0, msg, data);
    }

    // ============== 失败响应 ==============

    /**
     * 失败响应，默认消息
     */
    public static R<Void> fail() {
        return new R<>(400, "fail");
    }

    /**
     * 失败响应，自定义消息
     */
    public static <T> R<T> fail(String msg) {
        return new R<>(400, msg);
    }

    /**
     * 失败响应，自定义消息和数据
     */
    public static <T> R<T> fail(String msg, T data) {
        return new R<>(400, msg, data);
    }

    // ============== 常用失败响应 ==============

    /**
     * 未登录
     */
    public static <T> R<T> unauthorized() {
        return new R<>(401, "请先登录");
    }

    /**
     * 未登录，自定义消息
     */
    public static <T> R<T> unauthorized(String msg) {
        return new R<>(401, msg);
    }

    /**
     * 无权限
     */
    public static <T> R<T> forbidden() {
        return new R<>(403, "无权限访问");
    }

    /**
     * 无权限，自定义消息
     */
    public static <T> R<T> forbidden(String msg) {
        return new R<>(403, msg);
    }

    /**
     * 资源未找到
     */
    public static <T> R<T> notFound() {
        return new R<>(404, "资源不存在");
    }

    /**
     * 资源未找到，自定义消息
     */
    public static <T> R<T> notFound(String msg) {
        return new R<>(404, msg);
    }

    /**
     * 参数错误
     */
    public static <T> R<T> badRequest() {
        return new R<>(400, "参数错误");
    }

    /**
     * 参数错误，自定义消息
     */
    public static <T> R<T> badRequest(String msg) {
        return new R<>(400, msg);
    }
}
