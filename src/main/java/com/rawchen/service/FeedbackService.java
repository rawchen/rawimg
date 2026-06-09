package com.rawchen.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rawchen.entity.Feedback;

public interface FeedbackService extends IService<Feedback> {

    Feedback createFeedback(Feedback feedback);

}
